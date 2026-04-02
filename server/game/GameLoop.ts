import crypto from 'crypto';

import Bet from '../models/Bet';
import GameResult from '../models/GameResult';
import GameStats from '../models/GameStats';
import Transaction from '../models/Transaction';
import User from '../models/User';
import { BET_LIMITS, BET_TYPES, COLORS, NUMBER_RANGE, PAYOUTS, SEGMENTS, TIMING } from '../constants/game';
import * as gameState from '../redis/gameState';
import * as leader from '../redis/leader';
import * as pubsub from '../redis/pubsub';
import * as socketService from '../services/socketService';
import type {
  ActiveBet,
  BetParity,
  BetType,
  BetValue,
  GamePhase,
  GameStateSnapshot,
  SanitizedBetData,
  SocketAuthUser,
  WheelColor,
  WheelSegment,
} from '../types/game';
import logger from '../utils/logger';
import { secureRandomInt } from '../utils/random';

const GAME_STATES = {
  WAITING: 'WAITING',
  SPINNING: 'SPINNING',
  RESULT: 'RESULT',
} as const satisfies Record<string, GamePhase>;

const HISTORY_LIMIT = 15;
const VALID_BET_TYPES: readonly string[] = ['number', 'color', 'type'];
const VALID_COLORS: readonly string[] = Object.values(COLORS);
const VALID_PARITY: readonly string[] = Object.values(BET_TYPES);

const isBetType = (value: unknown): value is BetType =>
  typeof value === 'string' && VALID_BET_TYPES.includes(value);

const isWheelColor = (value: unknown): value is WheelColor =>
  typeof value === 'string' && VALID_COLORS.includes(value);

const isBetParity = (value: unknown): value is BetParity =>
  typeof value === 'string' && VALID_PARITY.includes(value);

class GameLoop {
  state: GamePhase = GAME_STATES.WAITING;

  bets: ActiveBet[] = [];

  history: WheelSegment[] = [];

  endTime = 0;

  result: WheelSegment | null = null;

  currentRoundId: string | null = null;

  roundNumber = 0;

  processing = false;

  running = false;

  tickInterval: NodeJS.Timeout | null = null;

  phaseTimer: NodeJS.Timeout | null = null;

  maxBetAmount = BET_LIMITS.MAX;

  private readonly userLocks = new Map<string, Promise<unknown>>();

  get timeLeft(): number {
    return Math.max(0, Math.ceil((this.endTime - Date.now()) / 1000));
  }

  async withUserLock<T>(userId: string, action: () => Promise<T>): Promise<T> {
    if (!this.userLocks.has(userId)) {
      this.userLocks.set(userId, Promise.resolve());
    }

    const currentLock = this.userLocks.get(userId) ?? Promise.resolve();
    let newLockPromise: Promise<unknown>;

    const promise = currentLock.then(async () => {
      try {
        return await action();
      } finally {
        if (this.userLocks.get(userId) === newLockPromise) {
          this.userLocks.delete(userId);
        }
      }
    });

    newLockPromise = promise.catch(() => undefined);
    this.userLocks.set(userId, newLockPromise);

    return promise;
  }

  async init(): Promise<void> {
    if (this.running) {
      logger.info('GameLoop already running, skipping init');
      return;
    }

    try {
      const redisState = await gameState.getGameState();
      const redisHistory = await gameState.getHistory();

      if (redisState && redisState.currentRoundId) {
        this.state = redisState.state;
        this.endTime = redisState.endTime;
        this.currentRoundId = redisState.currentRoundId;
        this.roundNumber = redisState.roundNumber;
        this.result = redisState.result;
        this.history = redisHistory.length > 0 ? redisHistory : [];

        const redisBets = await gameState.getActiveBets();
        if (redisBets.length > 0) {
          this.bets = redisBets;
        }

        logger.info(`Loaded state from Redis: round ${this.roundNumber} (${this.state})`);

        const remainingMs = Math.max(0, this.endTime - Date.now());
        if (this.state === GAME_STATES.SPINNING) {
          logger.info(`Resuming SPINNING round, ${remainingMs}ms remaining`);
          this.phaseTimer = setTimeout(() => {
            void this.processResults();
          }, remainingMs);
        } else if (this.state === GAME_STATES.RESULT) {
          logger.info(`Resuming RESULT round, ${remainingMs}ms remaining`);
          this.phaseTimer = setTimeout(() => {
            void this.reset();
          }, remainingMs);
        }

        this.startLoop(false);
        return;
      }

      await this.refundActiveBets();

      const results = await GameResult.find().sort({ createdAt: -1 }).limit(HISTORY_LIMIT);
      this.history = results.reverse().map((resultDocument: { number: number; color: WheelColor }) => ({
        number: resultDocument.number,
        color: resultDocument.color,
      }));

      const lastResult = await GameResult.findOne().sort({ roundNumber: -1 });
      this.roundNumber =
        lastResult && typeof lastResult.roundNumber === 'number' ? lastResult.roundNumber + 1 : 1;

      this.currentRoundId = await this.generateRoundId();
      await this.syncStateToRedis();

      logger.info(`Loaded from MongoDB: round ${this.roundNumber} (ID: ${this.currentRoundId})`);
      this.startLoop(true);
    } catch (err) {
      logger.error('Failed to initialize GameLoop', err);
      logger.info('Retrying GameLoop initialization in 5 seconds...');
      setTimeout(() => {
        void this.init();
      }, 5000);
    }
  }

  async syncStateToRedis(): Promise<void> {
    const snapshot: GameStateSnapshot = {
      state: this.state,
      endTime: this.endTime,
      currentRoundId: this.currentRoundId,
      roundNumber: this.roundNumber,
      result: this.result,
    };
    await gameState.setGameState(snapshot);
  }

  async syncBetsToRedis(): Promise<void> {
    await gameState.replaceActiveBets(this.bets);
  }

  async publishStateChange(): Promise<void> {
    await pubsub.publish(pubsub.CHANNELS.STATE_CHANGE, {
      state: this.state,
      endTime: this.endTime,
      currentRoundId: this.currentRoundId,
      result: this.state === GAME_STATES.RESULT ? this.result : null,
      targetResult: this.state === GAME_STATES.SPINNING ? this.result : null,
      bets: this.bets,
      history: this.history,
    });
  }

  async generateRoundId(): Promise<string> {
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

      let stats = await GameStats.findOneAndUpdate(
        { lastDate: dateStr },
        { $inc: { dailyNonce: 1 } },
        { new: true }
      );

      if (!stats) {
        stats = await GameStats.findOneAndUpdate(
          { lastDate: { $ne: dateStr } },
          { $set: { lastDate: dateStr, dailyNonce: 1 } },
          { new: true }
        );

        if (!stats) {
          stats = await GameStats.findOne();
          if (!stats) {
            stats = await GameStats.create({ lastDate: dateStr, dailyNonce: 1 });
          } else if (stats.lastDate === dateStr) {
            stats = await GameStats.findOneAndUpdate(
              { lastDate: dateStr },
              { $inc: { dailyNonce: 1 } },
              { new: true }
            );
          } else {
            stats.lastDate = dateStr;
            stats.dailyNonce = 1;
            await stats.save();
          }
        }
      }

      if (!stats) {
        throw new Error('GameStats document was not created while generating round ID');
      }

      const nonce = String(stats.dailyNonce).padStart(4, '0');
      return `${dateStr}-${nonce}`;
    } catch (err) {
      logger.error('Error generating round ID', err);
      return `FALLBACK-${Date.now()}`;
    }
  }

  async refundActiveBets(): Promise<void> {
    try {
      const activeBets = await Bet.find({ status: 'active' });
      if (activeBets.length === 0) {
        return;
      }

      logger.info(`Found ${activeBets.length} active bets to refund from crash`);

      for (const bet of activeBets) {
        const updatedUser = await User.findByIdAndUpdate(
          bet.user,
          { $inc: { balance: bet.amount } },
          { new: true }
        );
        bet.status = 'refunded';
        await bet.save();

        if (!updatedUser) {
          logger.warn(
            `User ${String(bet.user)} not found during refund - bet ${String(
              bet._id
            )} marked refunded but balance not updated`
          );
          continue;
        }

        const transaction = new Transaction({
          user: bet.user,
          type: 'adjustment',
          amount: bet.amount,
          balanceAfter: updatedUser.balance,
          description: 'Refund: Server Restart',
        });
        await transaction.save();

        socketService.emitToRoom('admin-room', 'admin:userUpdate', updatedUser);
      }

      logger.info('Refunded all active bets');
    } catch (err) {
      logger.error('Error refunding active bets', err);
    }
  }

  startLoop(resetEndTime = true): void {
    this.running = true;
    if (resetEndTime) {
      this.endTime = Date.now() + TIMING.WAITING_TIME * 1000;
    }

    void this.syncStateToRedis();

    this.tickInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
    this.running = false;
    logger.info('GameLoop stopped');
  }

  tick(): void {
    if (this.state === GAME_STATES.WAITING) {
      if (this.timeLeft <= 0) {
        this.spin();
      }
    } else if (this.state === GAME_STATES.RESULT) {
      if (this.timeLeft <= 0 && !this.processing) {
        void this.reset();
      }
    }

    this.broadcastUpdate();
  }

  broadcastUpdate(): void {
    socketService.emitToAll('gameUpdate', {
      state: this.state,
      endTime: this.endTime,
      result: this.state === GAME_STATES.RESULT ? this.result : null,
      targetResult: this.state === GAME_STATES.SPINNING ? this.result : null,
    });

    void this.publishStateChange();
  }

  broadcastState(): void {
    socketService.emitToAll('gameState', {
      state: this.state,
      endTime: this.endTime,
      bets: this.bets,
      history: this.history,
      result: this.state === GAME_STATES.RESULT ? this.result : null,
      targetResult: this.state === GAME_STATES.SPINNING ? this.result : null,
    });

    void this.syncStateToRedis();
    void this.publishStateChange();
  }

  spin(): void {
    this.processing = true;
    this.state = GAME_STATES.SPINNING;
    this.endTime = Date.now() + TIMING.SPIN_DURATION * 1000;

    const resultIndex = secureRandomInt(0, SEGMENTS.length);
    this.result = { ...SEGMENTS[resultIndex] };

    void this.syncStateToRedis();
    void this.publishStateChange();

    socketService.emitToAll('spinResult', {
      result: this.result,
      endTime: this.endTime,
    });

    this.phaseTimer = setTimeout(() => {
      void this.processResults();
    }, TIMING.SPIN_DURATION * 1000);
  }

  async processResults(): Promise<void> {
    if (!this.result || !this.currentRoundId) {
      logger.warn('Skipping result processing without an active result or round ID');
      this.processing = false;
      return;
    }

    try {
      const settledResult = this.result;

      this.state = GAME_STATES.RESULT;
      this.endTime = Date.now() + TIMING.RESULT_DURATION * 1000;

      this.history.unshift(settledResult);
      if (this.history.length > HISTORY_LIMIT) {
        this.history.pop();
      }

      const activeBets = await Bet.find({ status: 'active', roundId: this.currentRoundId });
      const betsByUser = new Map<string, typeof activeBets>();

      for (const bet of activeBets) {
        const userId = bet.user.toString();
        const existingUserBets = betsByUser.get(userId) ?? [];
        existingUserBets.push(bet);
        betsByUser.set(userId, existingUserBets);
      }

      let roundTotalBets = 0;
      let roundTotalWagered = 0;
      let roundTotalPayout = 0;
      let roundUniqueUsers = 0;

      for (const [userId, userBets] of betsByUser.entries()) {
        roundUniqueUsers += 1;
        roundTotalBets += userBets.length;

        for (const bet of userBets) {
          let winnings = 0;

          if (bet.type === 'number' && bet.value === settledResult.number) {
            winnings = Math.floor((bet.amount * PAYOUTS.NUMBER * 100) / 100);
          } else if (bet.type === 'color' && bet.value === settledResult.color) {
            winnings = Math.floor((bet.amount * PAYOUTS.COLOR * 100) / 100);
          } else if (bet.type === 'type') {
            if (bet.value === 'even' && settledResult.number !== 0 && settledResult.number % 2 === 0) {
              winnings = Math.floor((bet.amount * PAYOUTS.TYPE * 100) / 100);
            } else if (
              bet.value === 'odd' &&
              settledResult.number !== 0 &&
              settledResult.number % 2 !== 0
            ) {
              winnings = Math.floor((bet.amount * PAYOUTS.TYPE * 100) / 100);
            }
          }

          bet.status = 'completed';
          bet.result = winnings > 0 ? 'win' : 'loss';
          bet.payout = winnings;
          bet.gameResult = {
            number: settledResult.number,
            color: settledResult.color,
          };
        }

        userBets.sort(
          (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
        );

        const totalWinnings = userBets.reduce((sum, bet) => sum + bet.payout, 0);
        const totalBetAmount = userBets.reduce((sum, bet) => sum + bet.amount, 0);

        roundTotalWagered += totalBetAmount;
        roundTotalPayout += totalWinnings;

        const updatedUser =
          totalWinnings > 0
            ? await User.findByIdAndUpdate(userId, { $inc: { balance: totalWinnings } }, { new: true })
            : await User.findById(userId);

        if (updatedUser && totalWinnings > 0) {
          socketService.emitToUser(userId, 'balanceUpdate', { balance: updatedUser.balance });
          socketService.emitToRoom('admin-room', 'admin:userUpdate', updatedUser);
        }

        const finalBalance = updatedUser ? updatedUser.balance : 0;
        const initialBalance = finalBalance + totalBetAmount - totalWinnings;
        let runningBalance = initialBalance;

        for (const bet of userBets) {
          runningBalance -= bet.amount;
          runningBalance += bet.payout;
          bet.balanceAfter = runningBalance;
        }

        const bulkOps = userBets.map((bet) => ({
          updateOne: {
            filter: { _id: bet._id },
            update: {
              $set: {
                status: bet.status,
                result: bet.result,
                payout: bet.payout,
                balanceAfter: bet.balanceAfter,
                gameResult: bet.gameResult,
              },
            },
          },
        }));

        await Bet.bulkWrite(bulkOps);
      }

      const gameResult = new GameResult({
        roundId: this.currentRoundId,
        roundNumber: this.roundNumber,
        number: settledResult.number,
        color: settledResult.color,
        stats: {
          totalBets: roundTotalBets,
          totalWagered: roundTotalWagered,
          totalPayout: roundTotalPayout,
          netProfit: roundTotalWagered - roundTotalPayout,
          uniqueUsers: roundUniqueUsers,
        },
      });
      await gameResult.save();

      socketService.emitToRoom('admin-room', 'admin:newRound', gameResult);

      await GameStats.findOneAndUpdate(
        {},
        {
          $inc: {
            totalBets: roundTotalBets,
            totalWagered: roundTotalWagered,
            netProfit: roundTotalWagered - roundTotalPayout,
          },
        },
        { upsert: true }
      );

      socketService.emitToRoom('admin-room', 'admin:statsUpdate', {});
      await gameState.addHistoryEntry(settledResult);
    } catch (err) {
      logger.error('Error processing bets', err);
    } finally {
      this.bets = [];
      await gameState.clearActiveBets();
      this.broadcastState();
      this.processing = false;
    }
  }

  async reset(): Promise<void> {
    this.state = GAME_STATES.WAITING;
    this.endTime = Date.now() + TIMING.WAITING_TIME * 1000;
    this.bets = [];
    this.result = null;
    this.roundNumber += 1;

    try {
      this.currentRoundId = await this.generateRoundId();
    } catch (err) {
      logger.error('Failed to generate Round ID', err);
      this.currentRoundId = crypto.randomUUID();
    }

    this.broadcastState();
  }

  async placeBet(user: SocketAuthUser, betData: SanitizedBetData): Promise<number> {
    return this.withUserLock(user.id, async () => {
      if (this.state !== GAME_STATES.WAITING) {
        throw new Error('Betting is closed');
      }

      const { type, value, amount } = betData;
      const normalizedAmount = typeof amount === 'number' ? amount : Number(amount);

      if (
        !Number.isFinite(normalizedAmount) ||
        normalizedAmount < BET_LIMITS.MIN ||
        !Number.isInteger(normalizedAmount)
      ) {
        throw new Error(`Invalid bet amount (minimum is ${BET_LIMITS.MIN})`);
      }

      if (!isBetType(type)) {
        throw new Error('Invalid bet type');
      }

      let normalizedValue: BetValue;
      if (type === 'number') {
        if (
          typeof value !== 'number' ||
          !Number.isInteger(value) ||
          value < NUMBER_RANGE.MIN ||
          value > NUMBER_RANGE.MAX
        ) {
          throw new Error(`Invalid number bet (must be ${NUMBER_RANGE.MIN}-${NUMBER_RANGE.MAX})`);
        }
        normalizedValue = value;
      } else if (type === 'color') {
        if (!isWheelColor(value)) {
          throw new Error('Invalid color bet');
        }
        normalizedValue = value;
      } else {
        if (!isBetParity(value)) {
          throw new Error('Invalid type bet (must be even or odd)');
        }
        normalizedValue = value;
      }

      const userActiveBets = await Bet.find({
        user: user.id,
        status: 'active',
        roundId: this.currentRoundId,
      });
      const currentTotalBet = userActiveBets.reduce((sum, bet) => sum + bet.amount, 0);

      if (currentTotalBet + normalizedAmount > this.maxBetAmount) {
        const remainingAllowance = this.maxBetAmount - currentTotalBet;
        if (remainingAllowance <= 0) {
          throw new Error(`Maximum bet limit of ₹${this.maxBetAmount} reached for this round`);
        }
        throw new Error(
          `Bet exceeds limit. You can only bet ₹${remainingAllowance} more this round (Max: ₹${this.maxBetAmount})`
        );
      }

      const dbUser = await User.findOneAndUpdate(
        { _id: user.id, balance: { $gte: normalizedAmount } },
        { $inc: { balance: -normalizedAmount } },
        { new: true }
      );

      if (!dbUser) {
        throw new Error('Insufficient balance');
      }

      const newBet = await Bet.findOneAndUpdate(
        {
          user: user.id,
          status: 'active',
          roundId: this.currentRoundId,
          type,
          value: normalizedValue,
        },
        {
          $inc: { amount: normalizedAmount },
          $setOnInsert: {
            username: dbUser.username,
            user: user.id,
            status: 'active',
            roundId: this.currentRoundId,
            type,
            value: normalizedValue,
          },
        },
        { new: true, upsert: true }
      );

      const existingBet = this.bets.find(
        (bet) => bet.userId === user.id && bet.type === type && bet.value === normalizedValue
      );

      if (existingBet) {
        existingBet.amount += normalizedAmount;
      } else {
        this.bets.push({
          userId: user.id,
          username: dbUser.username,
          type,
          value: normalizedValue,
          amount: normalizedAmount,
          _id: String(newBet._id),
        });
      }

      const betToEmit = existingBet ?? this.bets[this.bets.length - 1];
      socketService.emitToAll('betPlaced', betToEmit);

      const redisKey = `${betToEmit.userId}:${betToEmit.type}:${String(betToEmit.value)}`;
      await gameState.setActiveBet(redisKey, betToEmit);
      await pubsub.publish(pubsub.CHANNELS.BET_UPDATE, {
        type: 'betPlaced',
        bet: betToEmit,
      });

      socketService.emitToRoom('admin-room', 'admin:userUpdate', dbUser);
      return dbUser.balance;
    });
  }

  async clearBets(user: SocketAuthUser): Promise<number> {
    return this.withUserLock(user.id, async () => {
      try {
        if (this.state !== GAME_STATES.WAITING) {
          throw new Error('Cannot clear bets now');
        }

        const activeBets = await Bet.find({
          user: user.id,
          status: 'active',
          roundId: this.currentRoundId,
        });

        if (activeBets.length === 0) {
          const dbUser = await User.findById(user.id);
          return dbUser?.balance ?? 0;
        }

        const totalRefund = activeBets.reduce((sum, bet) => sum + bet.amount, 0);

        await User.findByIdAndUpdate(user.id, { $inc: { balance: totalRefund } });
        await Bet.updateMany(
          { user: user.id, status: 'active', roundId: this.currentRoundId },
          { status: 'cancelled' }
        );

        this.bets = this.bets.filter((bet) => bet.userId !== user.id);

        socketService.emitToAll('betsCleared', user.id);
        await pubsub.publish(pubsub.CHANNELS.BET_UPDATE, {
          type: 'betsCleared',
          userId: user.id,
        });
        await this.syncBetsToRedis();

        const dbUser = await User.findById(user.id);
        socketService.emitToRoom('admin-room', 'admin:userUpdate', dbUser);
        return dbUser?.balance ?? 0;
      } catch (err) {
        logger.error('Error clearing bets for user', err, { userId: user.id });
        throw err;
      }
    });
  }
}

export default GameLoop;
