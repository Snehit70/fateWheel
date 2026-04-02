require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { createClient } = require('redis');
const socketService = require('./services/socketService');
const GameLoop = require('./game/GameLoop');
const logger = require('./utils/logger');
const User = require('./models/User');
const Bet = require('./models/Bet');
const jwt = require('jsonwebtoken');
const redisClient = require('./redis/redisClient');
const pubsub = require('./redis/pubsub');
const leader = require('./redis/leader');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const REDIS_URL = process.env.REDIS_URL;

// Initialize Socket.io via Service
const io = socketService.init(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"]
    },
    pingInterval: 25000,
    pingTimeout: 60000
});

// Middleware
app.use(require('helmet')());
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use(logger.requestLogger);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/game', require('./routes/game'));
app.get('/health', (req, res) => res.json({ status: "running" }));
app.get('/', (req, res) => {
    res.send('FateWheel Server is running');
});

// Database Connection
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT_NAME;
let MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
    if (isProduction) {
        logger.error('Critical Error: MONGO_URL not found in environment variables.');
        process.exit(1);
    } else {
        logger.warn('Warning: MONGO_URL not found in environment, defaulting to localhost for development.');
        MONGO_URL = 'mongodb://127.0.0.1:27017/fatewheel';
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
    mongoose.connect(MONGO_URL, {
        dbName: 'fatewheel',
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    })
        .then(() => logger.info('Connected to MongoDB (DB: fatewheel)'))
        .catch(err => logger.error('MongoDB connection error:', err));
}

// Global Error Handler for Express
app.use((err, req, res, next) => {
    logger.error('Unhandled Error', err);
    res.status(500).json({ message: 'Internal Server Error' });
});

// Socket.io Middleware for Auth
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.user && decoded.user.id) {
                socket.user = decoded.user;
            }
        } catch (err) {
            // Invalid token, but we allow connection for spectating
        }
    }
    next();
});

const PORT = process.env.PORT || 3000;
const gameLoop = new GameLoop();

const LEADER_PROMOTION_INTERVAL = 10000; // Try to acquire leadership every 10s
let adapterSubClient = null; // For cleanup during shutdown

// Initialize Redis, then leader election, then start game loop
const startServer = async () => {
    // Step 1: Connect Redis (optional - falls back to single-server mode)
    if (REDIS_URL) {
        await redisClient.connect();

        if (redisClient.isReady()) {
            // Apply Socket.io Redis adapter for cross-instance broadcasting
            const redisForAdapter = redisClient.getClient();
            if (redisForAdapter) {
                adapterSubClient = createClient({
                    url: REDIS_URL,
                    socket: {
                        reconnectStrategy: (retries) => {
                            if (retries > 10) return new Error('Adapter sub max retries');
                            return Math.min(retries * 100, 3000);
                        }
                    }
                });
                adapterSubClient.on('error', (err) => {
                    logger.error('Socket.io adapter sub-client error:', err.message);
                });
                try {
                    await adapterSubClient.connect();
                    await socketService.applyRedisAdapter(redisForAdapter, adapterSubClient);
                } catch (err) {
                    logger.warn('Socket.io Redis adapter failed:', err.message);
                }
            }

            // Initialize pub/sub for game state broadcasting
            await pubsub.init();

            // Subscribe to state changes — only followers apply remote state
            await pubsub.subscribe(pubsub.CHANNELS.STATE_CHANGE, (data) => {
                if (leader.isLeader()) return; // Leader owns state directly, skip self-messages

                if (data.state) gameLoop.state = data.state;
                if (data.endTime) gameLoop.endTime = data.endTime;
                if (data.bets) gameLoop.bets = data.bets;
                if (data.history) gameLoop.history = data.history;
                if (data.result !== undefined) gameLoop.result = data.result;

                socketService.emitToAll('gameState', {
                    state: data.state,
                    endTime: data.endTime,
                    bets: data.bets || [],
                    history: data.history || [],
                    result: data.result,
                    targetResult: data.targetResult,
                });
            });

            // Subscribe to bet updates — only followers apply remote bets
            await pubsub.subscribe(pubsub.CHANNELS.BET_UPDATE, (data) => {
                if (leader.isLeader()) return; // Leader handles bets directly

                if (data.type === 'betPlaced' && data.bet) {
                    const existingBet = gameLoop.bets.find(
                        b => b.userId === data.bet.userId && b.type === data.bet.type && b.value === data.bet.value
                    );
                    if (existingBet) {
                        existingBet.amount = data.bet.amount;
                    } else {
                        gameLoop.bets.push(data.bet);
                    }

                    socketService.emitToAll('betPlaced', data.bet);
                }

                if (data.type === 'betsCleared' && data.userId) {
                    gameLoop.bets = gameLoop.bets.filter(b => b.userId !== data.userId);
                    socketService.emitToAll('betsCleared', data.userId);
                }
            });
        }
    } else {
        logger.info('No REDIS_URL configured, running in single-server mode');
    }

    // Step 2: Acquire leader lock and start game loop if leader
    const acquired = await leader.acquire();
    if (acquired) {
        leader.startRenewal();
        logger.info('This instance is the LEADER - starting game loop');
        await gameLoop.init();
    } else {
        logger.info('This instance is a FOLLOWER - relaying state from leader');

        // Start promotion loop: periodically try to become leader if current leader dies
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
            } catch (err) {
                logger.error('Error in promotion loop:', err);
            }
        }, LEADER_PROMOTION_INTERVAL);
    }

    // Step 3: Start HTTP server (after game loop is initialized)
    server.listen(PORT, () => {
        logger.info(`Server running on port ${PORT} (Leader: ${leader.isLeader()})`);
    });
};

if (require.main === module) {
    startServer();
}

io.on('connection', async (socket) => {
    logger.info(`A user connected: ${socket.id} ${socket.user ? `(User: ${socket.user.id})` : '(Guest)'}`);

    if (socket.user) {
        socket.join(`user:${socket.user.id}`);
        logger.info(`Socket ${socket.id} joined room user:${socket.user.id}`);

        if (socket.user.role === 'admin') {
            socket.join('admin-room');
            logger.info(`Socket ${socket.id} joined admin-room`);
        }
    }

    // Load active bets from DB
    let activeBets = [];
    try {
        if (gameLoop.currentRoundId) {
            const dbBets = await Bet.find({
                status: 'active',
                roundId: gameLoop.currentRoundId
            }).select('user username type value amount').lean();

            activeBets = dbBets.map(b => ({
                userId: b.user.toString(),
                username: b.username,
                type: b.type,
                value: b.value,
                amount: b.amount
            }));
        }
    } catch (err) {
        logger.error('Failed to load bets for new connection:', err);
        activeBets = gameLoop.bets;
    }

    socket.emit('gameState', {
        state: gameLoop.state,
        timeLeft: gameLoop.timeLeft,
        bets: activeBets,
        history: gameLoop.history,
        result: gameLoop.result
    });

    socket.on('placeBet', async (betData, callback) => {
        if (typeof callback !== 'function') return;

        if (!socket.user) {
            return callback({ error: "Please login to bet" });
        }

        if (!leader.isLeader()) {
            return callback({ error: "Server is syncing, please try again" });
        }

        try {
            const user = await User.findById(socket.user.id);
            if (!user) {
                return callback({ error: "User not found" });
            }

            const sanitizedBetData = {
                type: betData?.type,
                value: betData?.value,
                amount: betData?.amount
            };

            const newBalance = await gameLoop.placeBet(socket.user, sanitizedBetData);
            callback({ success: true, newBalance });
        } catch (err) {
            callback({ error: err.message });
        }
    });

    socket.on('clearBets', async (callback) => {
        if (typeof callback !== 'function') return;

        if (!socket.user) {
            return callback({ error: "Please login" });
        }

        if (!leader.isLeader()) {
            return callback({ error: "Server is syncing, please try again" });
        }

        try {
            const newBalance = await gameLoop.clearBets(socket.user);
            callback({ success: true, newBalance });
        } catch (err) {
            callback({ error: err.message });
        }
    });

    socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.id}`);
    });

    socket.on('timeSync', (callback) => {
        if (typeof callback !== 'function') return;
        callback(Date.now());
    });

    socket.on('requestState', async () => {
        let activeBets = [];
        try {
            if (gameLoop.currentRoundId) {
                const dbBets = await Bet.find({
                    status: 'active',
                    roundId: gameLoop.currentRoundId
                }).select('user username type value amount').lean();

                activeBets = dbBets.map(b => ({
                    userId: b.user.toString(),
                    username: b.username,
                    type: b.type,
                    value: b.value,
                    amount: b.amount
                }));
            }
        } catch (err) {
            logger.error('Failed to load bets for requestState:', err);
            activeBets = gameLoop.bets;
        }

        socket.emit('gameState', {
            state: gameLoop.state,
            timeLeft: gameLoop.timeLeft,
            bets: activeBets,
            history: gameLoop.history,
            result: gameLoop.result,
            endTime: gameLoop.endTime
        });
    });
});

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);

    // Release leader lock
    try {
        await leader.release();
        logger.info('Leader lock released');
    } catch (err) {
        logger.error('Error releasing leader lock:', err);
    }

    // Disconnect Redis
    try {
        if (adapterSubClient) {
            await adapterSubClient.quit();
        }
        await pubsub.disconnect();
        await redisClient.disconnect();
        logger.info('Redis connections closed');
    } catch (err) {
        logger.error('Error closing Redis connections:', err);
    }

    server.close(() => {
        logger.info('HTTP server closed');
    });

    try {
        await mongoose.disconnect();
        logger.info('MongoDB connection closed');
    } catch (err) {
        logger.error('Error closing MongoDB connection:', err);
    }

    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = { app, server };
