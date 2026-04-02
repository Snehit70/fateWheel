import 'dotenv/config';

import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import http from 'http';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import { type Socket } from 'socket.io';

import Bet from './models/Bet';
import User from './models/User';
import GameLoop from './game/GameLoop';
import * as leader from './redis/leader';
import * as pubsub from './redis/pubsub';
import * as redisClient from './redis/redisClient';
import * as socketService from './services/socketService';
import type { ActiveBet, GamePhase, SanitizedBetData, SocketAuthUser, WheelSegment } from './types/game';
import logger from './utils/logger';
import authRoutes = require('./routes/auth');
import adminRoutes = require('./routes/admin');
import gameRoutes = require('./routes/game');

type GameSocket = Socket & { user?: SocketAuthUser };
type AckResponse = { success?: true; newBalance?: number; error?: string };
type AckCallback = (response: AckResponse) => void;
type LeanSocketBet = {
  user: { toString(): string };
  username: string;
  type: ActiveBet['type'];
  value: ActiveBet['value'];
  amount: number;
};

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const REDIS_URL = process.env.REDIS_URL;

const GAME_PHASES: readonly string[] = ['WAITING', 'SPINNING', 'RESULT'];

const io = socketService.init(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSocketAuthUser = (value: unknown): value is SocketAuthUser =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.role === 'string' &&
  (value.username === undefined || typeof value.username === 'string');

const isGamePhase = (value: unknown): value is GamePhase =>
  typeof value === 'string' && GAME_PHASES.includes(value);

const isWheelSegment = (value: unknown): value is WheelSegment =>
  isRecord(value) && typeof value.number === 'number' && typeof value.color === 'string';

const isActiveBet = (value: unknown): value is ActiveBet =>
  isRecord(value) &&
  typeof value.userId === 'string' &&
  typeof value.username === 'string' &&
  typeof value.type === 'string' &&
  'value' in value &&
  typeof value.amount === 'number';

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const getSocketUserFromToken = (token: string): SocketAuthUser | undefined => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? '');
    if (typeof decoded === 'string') {
      return undefined;
    }

    const payloadUser = (decoded as JwtPayload).user;
    return isSocketAuthUser(payloadUser) ? payloadUser : undefined;
  } catch {
    return undefined;
  }
};

app.use(helmet());
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use(logger.requestLogger);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/game', gameRoutes);
app.get('/health', (_req, res) => res.json({ status: 'running' }));
app.get('/', (_req, res) => {
  res.send('FateWheel Server is running');
});

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT_NAME);
let mongoUrl = process.env.MONGO_URL;

if (!mongoUrl) {
  if (isProduction) {
    logger.error('Critical Error: MONGO_URL not found in environment variables.');
    process.exit(1);
  } else {
    logger.warn('Warning: MONGO_URL not found in environment, defaulting to localhost for development.');
    mongoUrl = 'mongodb://127.0.0.1:27017/fatewheel';
  }
}

if (!process.env.JWT_SECRET) {
  logger.error('Critical Error: JWT_SECRET must be defined in environment variables.');
  process.exit(1);
}

if (!process.env.CLIENT_URL) {
  logger.error('Critical Error: CLIENT_URL must be defined in environment variables for CORS.');
  process.exit(1);
}

if (process.env.NODE_ENV !== 'test') {
  void mongoose
    .connect(mongoUrl, {
      dbName: 'fatewheel',
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then(() => logger.info('Connected to MongoDB (DB: fatewheel)'))
    .catch((error: unknown) => logger.error('MongoDB connection error', error));
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled Error', err);
  res.status(500).json({ message: 'Internal Server Error' });
});

io.use((socket: GameSocket, next) => {
  const token = socket.handshake.auth.token;
  if (typeof token === 'string') {
    const user = getSocketUserFromToken(token);
    if (user) {
      socket.user = user;
    }
  }
  next();
});

const PORT = parseNumber(process.env.PORT) ?? 3000;
const gameLoop = new GameLoop();
const LEADER_PROMOTION_INTERVAL = 10000;
let adapterSubClient: ReturnType<typeof createClient> | null = null;

const startServer = async (): Promise<void> => {
  if (REDIS_URL) {
    await redisClient.connect();

    if (redisClient.isReady()) {
      const redisForAdapter = redisClient.getClient();
      if (redisForAdapter) {
        adapterSubClient = createClient({
          url: REDIS_URL,
          socket: {
            reconnectStrategy: (retries) => {
              if (retries > 10) {
                return new Error('Adapter sub max retries');
              }
              return Math.min(retries * 100, 3000);
            },
          },
        });

        adapterSubClient.on('error', (error: Error) => {
          logger.error('Socket.io adapter sub-client error', error);
        });

        try {
          await adapterSubClient.connect();
          await socketService.applyRedisAdapter(redisForAdapter, adapterSubClient);
        } catch (error) {
          logger.warn('Socket.io Redis adapter failed', {
            error: getErrorMessage(error),
          });
        }
      }

      await pubsub.init();

      await pubsub.subscribe(pubsub.CHANNELS.STATE_CHANGE, async (payload) => {
        if (leader.isLeader() || !isRecord(payload)) {
          return;
        }

        if (isGamePhase(payload.state)) {
          gameLoop.state = payload.state;
        }

        const endTime = parseNumber(payload.endTime);
        if (endTime !== null) {
          gameLoop.endTime = endTime;
        }

        if (typeof payload.currentRoundId === 'string') {
          gameLoop.currentRoundId = payload.currentRoundId;
        }

        if (Array.isArray(payload.bets)) {
          gameLoop.bets = payload.bets.filter(isActiveBet);
        }

        if (Array.isArray(payload.history)) {
          gameLoop.history = payload.history.filter(isWheelSegment);
        }

        gameLoop.result = isWheelSegment(payload.result) ? payload.result : null;

        socketService.emitToLocal('gameState', {
          state: gameLoop.state,
          endTime: gameLoop.endTime,
          bets: gameLoop.bets,
          history: gameLoop.history,
          result: gameLoop.result,
          targetResult: isWheelSegment(payload.targetResult) ? payload.targetResult : null,
        });
      });

      await pubsub.subscribe(pubsub.CHANNELS.BET_UPDATE, async (payload) => {
        if (leader.isLeader() || !isRecord(payload) || typeof payload.type !== 'string') {
          return;
        }

        if (payload.type === 'betPlaced' && isActiveBet(payload.bet)) {
          const placedBet = payload.bet;
          const existingBet = gameLoop.bets.find(
            (bet) =>
              bet.userId === placedBet.userId &&
              bet.type === placedBet.type &&
              bet.value === placedBet.value
          );

          if (existingBet) {
            existingBet.amount = placedBet.amount;
          } else {
            gameLoop.bets.push(placedBet);
          }

          socketService.emitToLocal('betPlaced', placedBet);
        }

        if (payload.type === 'betsCleared' && typeof payload.userId === 'string') {
          gameLoop.bets = gameLoop.bets.filter((bet) => bet.userId !== payload.userId);
          socketService.emitToLocal('betsCleared', payload.userId);
        }
      });
    }
  } else {
    logger.info('No REDIS_URL configured, running in single-server mode');
  }

  const acquired = await leader.acquire();
  if (acquired) {
    leader.startRenewal();
    logger.info('This instance is the LEADER - starting game loop');
    await gameLoop.init();
  } else {
    logger.info('This instance is a FOLLOWER - relaying state from leader');

    setInterval(async () => {
      try {
        if (!leader.isLeader()) {
          const promoted = await leader.acquire();
          if (promoted) {
            leader.startRenewal();
            logger.info('Promoted to LEADER - starting game loop');
            await gameLoop.init();
          }
        }
      } catch (error) {
        logger.error('Error in promotion loop', error);
      }
    }, LEADER_PROMOTION_INTERVAL);
  }

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} (Leader: ${leader.isLeader()})`);
  });
};

if (require.main === module) {
  void startServer();
}

io.on('connection', async (socket: GameSocket) => {
  logger.info(`A user connected: ${socket.id} ${socket.user ? `(User: ${socket.user.id})` : '(Guest)'}`);

  if (socket.user) {
    socket.join(`user:${socket.user.id}`);
    logger.info(`Socket ${socket.id} joined room user:${socket.user.id}`);

    if (socket.user.role === 'admin') {
      socket.join('admin-room');
      logger.info(`Socket ${socket.id} joined admin-room`);
    }
  }

  let activeBets: ActiveBet[] = [];
  try {
    if (gameLoop.currentRoundId) {
      const dbBets = await Bet.find({
        status: 'active',
        roundId: gameLoop.currentRoundId,
      })
        .select('user username type value amount')
        .lean<LeanSocketBet[]>();

      activeBets = dbBets.map(
        (bet: { user: { toString(): string }; username: string; type: ActiveBet['type']; value: ActiveBet['value']; amount: number }) => ({
          userId: bet.user.toString(),
          username: bet.username,
          type: bet.type,
          value: bet.value,
          amount: bet.amount,
        })
      );
    }
  } catch (error) {
    logger.error('Failed to load bets for new connection', error);
    activeBets = gameLoop.bets;
  }

  socket.emit('gameState', {
    state: gameLoop.state,
    timeLeft: gameLoop.timeLeft,
    bets: activeBets,
    history: gameLoop.history,
    result: gameLoop.result,
  });

  socket.on('placeBet', async (betData: SanitizedBetData, callback: AckCallback) => {
    if (typeof callback !== 'function') {
      return;
    }

    if (!socket.user) {
      callback({ error: 'Please login to bet' });
      return;
    }

    if (!leader.isLeader()) {
      callback({ error: 'Server is syncing, please try again' });
      return;
    }

    try {
      const user = await User.findById(socket.user.id);
      if (!user) {
        callback({ error: 'User not found' });
        return;
      }

      const sanitizedBetData: SanitizedBetData = {
        type: betData?.type,
        value: betData?.value,
        amount: betData?.amount,
      };

      const newBalance = await gameLoop.placeBet(socket.user, sanitizedBetData);
      callback({ success: true, newBalance });
    } catch (error) {
      callback({ error: getErrorMessage(error) });
    }
  });

  socket.on('clearBets', async (callback: AckCallback) => {
    if (typeof callback !== 'function') {
      return;
    }

    if (!socket.user) {
      callback({ error: 'Please login' });
      return;
    }

    if (!leader.isLeader()) {
      callback({ error: 'Server is syncing, please try again' });
      return;
    }

    try {
      const newBalance = await gameLoop.clearBets(socket.user);
      callback({ success: true, newBalance });
    } catch (error) {
      callback({ error: getErrorMessage(error) });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });

  socket.on('timeSync', (callback: (timestamp: number) => void) => {
    if (typeof callback === 'function') {
      callback(Date.now());
    }
  });

  socket.on('requestState', async () => {
    let latestBets: ActiveBet[] = [];
    try {
      if (gameLoop.currentRoundId) {
        const dbBets = await Bet.find({
          status: 'active',
          roundId: gameLoop.currentRoundId,
        })
          .select('user username type value amount')
          .lean<LeanSocketBet[]>();

        latestBets = dbBets.map(
          (bet: { user: { toString(): string }; username: string; type: ActiveBet['type']; value: ActiveBet['value']; amount: number }) => ({
            userId: bet.user.toString(),
            username: bet.username,
            type: bet.type,
            value: bet.value,
            amount: bet.amount,
          })
        );
      }
    } catch (error) {
      logger.error('Failed to load bets for requestState', error);
      latestBets = gameLoop.bets;
    }

    socket.emit('gameState', {
      state: gameLoop.state,
      timeLeft: gameLoop.timeLeft,
      bets: latestBets,
      history: gameLoop.history,
      result: gameLoop.result,
      endTime: gameLoop.endTime,
    });
  });
});

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  try {
    await leader.release();
    logger.info('Leader lock released');
  } catch (error) {
    logger.error('Error releasing leader lock', error);
  }

  try {
    if (adapterSubClient) {
      await adapterSubClient.quit();
    }
    await pubsub.disconnect();
    await redisClient.disconnect();
    logger.info('Redis connections closed');
  } catch (error) {
    logger.error('Error closing Redis connections', error);
  }

  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection', error);
  }

  process.exit(0);
};

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', undefined, { reason, promise });
  process.exit(1);
});

export { app, server, startServer };
