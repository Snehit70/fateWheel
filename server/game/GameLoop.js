const crypto = require('crypto');

const User = require('../models/User');
const Bet = require('../models/Bet');
const GameResult = require('../models/GameResult');
const Transaction = require('../models/Transaction');
const GameStats = require('../models/GameStats');
const { SEGMENTS, PAYOUTS, TIMING, COLORS, BET_LIMITS, BET_TYPES, NUMBER_RANGE } = require('../constants/game');
const logger = require('../utils/logger');
const { secureRandomInt } = require('../utils/random');
const socketService = require('../services/socketService');
const gameState = require('../redis/gameState');
const pubsub = require('../redis/pubsub');
const leader = require('../redis/leader');

const GAME_STATES = {
    WAITING: 'WAITING',
    SPINNING: 'SPINNING',
    RESULT: 'RESULT'
};

const HISTORY_LIMIT = 15;

class GameLoop {
    constructor() {
        this.state = GAME_STATES.WAITING;
        this.bets = [];
        this.history = [];
        this.endTime = 0;
        this.result = null;
        this.currentRoundId = null;
        this.roundNumber = 0;
        this.processing = false;

        this.maxBetAmount = BET_LIMITS.MAX;

        this.userLocks = new Map();
    }

    async withUserLock(userId, action) {
        if (!this.userLocks.has(userId)) {
            this.userLocks.set(userId, Promise.resolve());
        }

        const currentLock = this.userLocks.get(userId);
        let newLockPromise;

        const promise = currentLock.then(async () => {
            try {
                return await action();
            } finally {
                if (this.userLocks.get(userId) === newLockPromise) {
                    this.userLocks.delete(userId);
                }
            }
        });

        newLockPromise = promise.catch(() => {});
        this.userLocks.set(userId, newLockPromise);

        return promise;
    }

    async init() {
        try {
            await this.refundActiveBets();

            // Try to load state from Redis first
            const redisState = await gameState.getGameState();
            const redisHistory = await gameState.getHistory();

            if (redisState && redisState.currentRoundId) {
                this.state = redisState.state;
                this.endTime = redisState.endTime;
                this.currentRoundId = redisState.currentRoundId;
                this.roundNumber = redisState.roundNumber;
                this.result = redisState.result;
                this.history = redisHistory.length > 0 ? redisHistory : [];

                // Restore bets from Redis
                const redisBets = await gameState.getActiveBets();
                if (redisBets.length > 0) {
                    this.bets = redisBets;
                }

                logger.info(`Loaded state from Redis: round ${this.roundNumber} (${this.state})`);
            } else {
                // Fallback: load from MongoDB
                const results = await GameResult.find().sort({ createdAt: -1 }).limit(HISTORY_LIMIT);
                this.history = results.reverse().map(r => ({ number: r.number, color: r.color }));

                const lastResult = await GameResult.findOne().sort({ roundNumber: -1 });
                this.roundNumber = (lastResult && typeof lastResult.roundNumber === 'number') ? lastResult.roundNumber + 1 : 1;

                this.currentRoundId = await this.generateRoundId();

                // Persist initial state to Redis
                await this.syncStateToRedis();

                logger.info(`Loaded from MongoDB: round ${this.roundNumber} (ID: ${this.currentRoundId})`);
            }

            this.startLoop();
        } catch (err) {
            logger.error("Failed to initialize GameLoop:", err);
            logger.info("Retrying GameLoop initialization in 5 seconds...");
            setTimeout(() => this.init(), 5000);
        }
    }

    async syncStateToRedis() {
        await gameState.setGameState({
            state: this.state,
            endTime: this.endTime,
            currentRoundId: this.currentRoundId,
            roundNumber: this.roundNumber,
            result: this.result,
        });
    }

    async syncBetsToRedis() {
        await gameState.clearActiveBets();
        for (const bet of this.bets) {
            const key = `${bet.userId}:${bet.type}:${bet.value}`;
            await gameState.setActiveBet(key, bet);
        }
    }

    async publishStateChange() {
        await pubsub.publish(pubsub.CHANNELS.STATE_CHANGE, {
            state: this.state,
            endTime: this.endTime,
            result: this.state === GAME_STATES.RESULT ? this.result : null,
            targetResult: this.state === GAME_STATES.SPINNING ? this.result : null,
            bets: this.bets,
            history: this.history,
        });
    }

    async generateRoundId() {
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

            const nonce = String(stats.dailyNonce).padStart(4, '0');
            return `${dateStr}-${nonce}`;
        } catch (err) {
            logger.error("Error generating round ID:", err);
            return `FALLBACK-${Date.now()}`;
        }
    }

    async refundActiveBets() {
        try {
            const activeBets = await Bet.find({ status: 'active' });
            if (activeBets.length === 0) return;

            logger.info(`Found ${activeBets.length} active bets to refund from crash`);

            for (const bet of activeBets) {
                const updatedUser = await User.findByIdAndUpdate(bet.user, { $inc: { balance: bet.amount } }, { new: true });
                bet.status = 'refunded';
                await bet.save();

                if (!updatedUser) {
                    logger.warn(`User ${bet.user} not found during refund - bet ${bet._id} marked refunded but balance not updated`);
                    continue;
                }

                const transaction = new Transaction({
                    user: bet.user,
                    type: 'adjustment',
                    amount: bet.amount,
                    balanceAfter: updatedUser.balance,
                    description: 'Refund: Server Restart'
                });
                await transaction.save();

                socketService.emitToRoom('admin-room', 'admin:userUpdate', updatedUser);
            }
            logger.info("Refunded all active bets");
        } catch (err) {
            logger.error("Error refunding active bets:", err);
        }
    }

    startLoop() {
        this.endTime = Date.now() + TIMING.WAITING_TIME * 1000;
        this.syncStateToRedis();

        setInterval(() => {
            this.tick();
        }, 1000);
    }

    tick() {
        // Renew leader lock if using Redis
        if (leader.isLeader()) {
            leader.renew();
        }

        const now = Date.now();
        const timeLeft = Math.max(0, (this.endTime - now) / 1000);

        if (this.state === GAME_STATES.WAITING) {
            if (timeLeft <= 0) {
                this.spin();
            }
        } else if (this.state === GAME_STATES.RESULT) {
            if (timeLeft <= 0 && !this.processing) {
                this.reset();
            }
        }

        this.broadcastUpdate();
    }

    broadcastUpdate() {
        socketService.emitToAll('gameUpdate', {
            state: this.state,
            endTime: this.endTime,
            result: this.state === GAME_STATES.RESULT ? this.result : null,
            targetResult: this.state === GAME_STATES.SPINNING ? this.result : null
        });

        // Publish to Redis for other instances
        this.publishStateChange();
    }

    broadcastState() {
        socketService.emitToAll('gameState', {
            state: this.state,
            endTime: this.endTime,
            bets: this.bets,
            history: this.history,
            result: this.state === GAME_STATES.RESULT ? this.result : null,
            targetResult: this.state === GAME_STATES.SPINNING ? this.result : null
        });

        this.syncStateToRedis();
        this.publishStateChange();
    }

    spin() {
        this.processing = true;
        this.state = GAME_STATES.SPINNING;
        this.endTime = Date.now() + TIMING.SPIN_DURATION * 1000;

        const resultIndex = secureRandomInt(0, 15);
        this.result = SEGMENTS[resultIndex];

        this.syncStateToRedis();

        socketService.emitToAll('spinResult', {
            result: this.result,
            endTime: this.endTime
        });

        setTimeout(() => {
            this.processResults();
        }, TIMING.SPIN_DURATION * 1000);
    }

    async processResults() {
        try {
            this.state = GAME_STATES.RESULT;
            this.endTime = Date.now() + TIMING.RESULT_DURATION * 1000;

            this.history.unshift(this.result);
            if (this.history.length > HISTORY_LIMIT) this.history.pop();

            await gameState.addHistoryEntry(this.result);

            const activeBets = await Bet.find({ status: 'active', roundId: this.currentRoundId });

            const betsByUser = new Map();
            for (const bet of activeBets) {
                const userId = bet.user.toString();
                if (!betsByUser.has(userId)) {
                    betsByUser.set(userId, []);
                }
                betsByUser.get(userId).push(bet);
            }

            let roundTotalBets = 0;
            let roundTotalWagered = 0;
            let roundTotalPayout = 0;
            let roundUniqueUsers = 0;

            for (const [userId, userBets] of betsByUser) {
                roundUniqueUsers++;
                roundTotalBets += userBets.length;

                for (const bet of userBets) {
                    let winnings = 0;
                    if (bet.type === "number" && bet.value === this.result.number) {
                        winnings = Math.floor((bet.amount * PAYOUTS.NUMBER * 100) / 100);
                    } else if (bet.type === "color" && bet.value === this.result.color) {
                        winnings = Math.floor((bet.amount * PAYOUTS.COLOR * 100) / 100);
                    } else if (bet.type === "type") {
                        if (bet.value === "even" && this.result.number !== 0 && this.result.number % 2 === 0) {
                            winnings = Math.floor((bet.amount * PAYOUTS.TYPE * 100) / 100);
                        } else if (bet.value === "odd" && this.result.number !== 0 && this.result.number % 2 !== 0) {
                            winnings = Math.floor((bet.amount * PAYOUTS.TYPE * 100) / 100);
                        }
                    }

                    bet.status = 'completed';
                    bet.result = winnings > 0 ? 'win' : 'loss';
                    bet.payout = winnings;
                    bet.gameResult = {
                        number: this.result.number,
                        color: this.result.color
                    };
                }

                userBets.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                const totalWinnings = userBets.reduce((sum, bet) => sum + bet.payout, 0);
                const totalBetAmount = userBets.reduce((sum, bet) => sum + bet.amount, 0);

                roundTotalWagered += totalBetAmount;
                roundTotalPayout += totalWinnings;

                let updatedUser;
                if (totalWinnings > 0) {
                    updatedUser = await User.findByIdAndUpdate(
                        userId,
                        { $inc: { balance: totalWinnings } },
                        { new: true }
                    );
                } else {
                    updatedUser = await User.findById(userId);
                }

                if (updatedUser) {
                    if (totalWinnings > 0) {
                        socketService.emitToUser(userId, 'balanceUpdate', { balance: updatedUser.balance });
                        socketService.emitToRoom('admin-room', 'admin:userUpdate', updatedUser);
                    }
                }

                const finalBalance = updatedUser ? updatedUser.balance : 0;
                const initialBalance = finalBalance + totalBetAmount - totalWinnings;
                let runningBalance = initialBalance;

                for (const bet of userBets) {
                    runningBalance -= bet.amount;
                    runningBalance += bet.payout;
                    bet.balanceAfter = runningBalance;
                }

                const bulkOps = userBets.map(bet => ({
                    updateOne: {
                        filter: { _id: bet._id },
                        update: {
                            $set: {
                                status: bet.status,
                                result: bet.result,
                                payout: bet.payout,
                                balanceAfter: bet.balanceAfter,
                                gameResult: bet.gameResult
                            }
                        }
                    }
                }));
                await Bet.bulkWrite(bulkOps);
            }

            const gameResult = new GameResult({
                roundId: this.currentRoundId,
                roundNumber: this.roundNumber,
                number: this.result.number,
                color: this.result.color,
                stats: {
                    totalBets: roundTotalBets,
                    totalWagered: roundTotalWagered,
                    totalPayout: roundTotalPayout,
                    netProfit: roundTotalWagered - roundTotalPayout,
                    uniqueUsers: roundUniqueUsers
                }
            });
            await gameResult.save();

            socketService.emitToRoom('admin-room', 'admin:newRound', gameResult);

            await GameStats.findOneAndUpdate({}, {
                $inc: {
                    totalBets: roundTotalBets,
                    totalWagered: roundTotalWagered,
                    netProfit: roundTotalWagered - roundTotalPayout
                }
            }, { upsert: true });

            socketService.emitToRoom('admin-room', 'admin:statsUpdate');

        } catch (err) {
            logger.error("Error processing bets:", err);
        } finally {
            this.bets = [];
            await gameState.clearActiveBets();
            this.broadcastState();
            this.processing = false;
        }
    }

    async reset() {
        this.state = GAME_STATES.WAITING;
        this.endTime = Date.now() + TIMING.WAITING_TIME * 1000;
        this.bets = [];
        this.result = null;
        this.roundNumber++;

        try {
            this.currentRoundId = await this.generateRoundId();
        } catch (e) {
            logger.error("Failed to generate Round ID:", e);
            this.currentRoundId = crypto.randomUUID();
        }

        this.broadcastState();
    }

    async placeBet(user, betData) {
        return this.withUserLock(user.id, async () => {
            if (this.state !== GAME_STATES.WAITING) {
                throw new Error("Betting is closed");
            }

            const { type, value, amount } = betData;

            if (!amount || isNaN(amount) || amount < BET_LIMITS.MIN || !Number.isInteger(amount)) {
                throw new Error(`Invalid bet amount (minimum is ${BET_LIMITS.MIN})`);
            }

            const VALID_TYPES = ['number', 'color', 'type'];
            if (!VALID_TYPES.includes(type)) {
                throw new Error("Invalid bet type");
            }

            if (type === 'number') {
                if (!Number.isInteger(value) || value < NUMBER_RANGE.MIN || value > NUMBER_RANGE.MAX) {
                    throw new Error(`Invalid number bet (must be ${NUMBER_RANGE.MIN}-${NUMBER_RANGE.MAX})`);
                }
            } else if (type === 'color') {
                if (!Object.values(COLORS).includes(value)) {
                    throw new Error("Invalid color bet");
                }
            } else if (type === 'type') {
                if (!Object.values(BET_TYPES).includes(value)) {
                    throw new Error("Invalid type bet (must be even or odd)");
                }
            }

            const userActiveBets = await Bet.find({ user: user.id, status: 'active', roundId: this.currentRoundId });
            const currentTotalBet = userActiveBets.reduce((sum, b) => sum + b.amount, 0);

            if (currentTotalBet + amount > this.maxBetAmount) {
                const remainingAllowance = this.maxBetAmount - currentTotalBet;
                if (remainingAllowance <= 0) {
                    throw new Error(`Maximum bet limit of ₹${this.maxBetAmount} reached for this round`);
                }
                throw new Error(`Bet exceeds limit. You can only bet ₹${remainingAllowance} more this round (Max: ₹${this.maxBetAmount})`);
            }

            const dbUser = await User.findOneAndUpdate(
                { _id: user.id, balance: { $gte: amount } },
                { $inc: { balance: -amount } },
                { new: true }
            );

            if (!dbUser) {
                throw new Error("Insufficient balance");
            }

            const newBet = await Bet.findOneAndUpdate(
                {
                    user: user.id,
                    status: 'active',
                    roundId: this.currentRoundId,
                    type,
                    value
                },
                {
                    $inc: { amount: amount },
                    $setOnInsert: {
                        username: dbUser.username,
                        user: user.id,
                        status: 'active',
                        roundId: this.currentRoundId,
                        type,
                        value
                    }
                },
                { new: true, upsert: true }
            );

            const existingBet = this.bets.find(b => b.userId === user.id && b.type === type && b.value === value);

            if (existingBet) {
                existingBet.amount += amount;
            } else {
                const bet = {
                    userId: user.id,
                    username: dbUser.username,
                    type,
                    value,
                    amount,
                    _id: newBet._id
                };
                this.bets.push(bet);
            }

            const betToEmit = existingBet || this.bets[this.bets.length - 1];
            socketService.emitToAll('betPlaced', betToEmit);

            // Persist bet to Redis
            const redisKey = `${betToEmit.userId}:${betToEmit.type}:${betToEmit.value}`;
            await gameState.setActiveBet(redisKey, betToEmit);

            // Publish bet update to Redis
            await pubsub.publish(pubsub.CHANNELS.BET_UPDATE, {
                type: 'betPlaced',
                bet: betToEmit,
            });

            socketService.emitToRoom('admin-room', 'admin:userUpdate', dbUser);
            return dbUser.balance;
        });
    }

    async clearBets(user) {
        return this.withUserLock(user.id, async () => {
            try {
                if (this.state !== GAME_STATES.WAITING) {
                    throw new Error("Cannot clear bets now");
                }

                const activeBets = await Bet.find({ user: user.id, status: 'active', roundId: this.currentRoundId });
                if (activeBets.length === 0) {
                    const dbUser = await User.findById(user.id);
                    return dbUser?.balance ?? 0;
                }

                const totalRefund = activeBets.reduce((sum, b) => sum + b.amount, 0);

                await User.findByIdAndUpdate(user.id, { $inc: { balance: totalRefund } });

                await Bet.updateMany(
                    { user: user.id, status: 'active', roundId: this.currentRoundId },
                    { status: 'cancelled' }
                );

                this.bets = this.bets.filter(b => b.userId !== user.id);

                socketService.emitToAll('betsCleared', user.id);

                // Sync bets to Redis after clearing
                await this.syncBetsToRedis();

                const dbUser = await User.findById(user.id);
                socketService.emitToRoom('admin-room', 'admin:userUpdate', dbUser);
                return dbUser.balance;
            } catch (err) {
                logger.error("Error clearing bets for user:", user.id, err);
                throw err;
            }
        });
    }
}

module.exports = GameLoop;
