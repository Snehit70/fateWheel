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

// Map constants to local variables for easier usage if needed, or use directly
const GAME_STATES = {
    WAITING: 'WAITING',
    SPINNING: 'SPINNING',
    RESULT: 'RESULT'
};

// Consistent history limit for UI display
const HISTORY_LIMIT = 15;

class GameLoop {
    constructor() {
        this.state = GAME_STATES.WAITING;
        this.bets = []; // Cache for UI, but source of truth is DB for money
        this.history = [];
        this.endTime = 0; // Timestamp for current phase end
        this.result = null;
        this.currentRoundId = null; // Will be set in init()
        this.roundNumber = 0; // Will be set from DB in init()
        this.processing = false;

        // Use centralized constants for bet limits
        this.maxBetAmount = BET_LIMITS.MAX;

        // Initialize locks map
        this.userLocks = new Map();
    }

    // Simple mutex implementation
    async withUserLock(userId, action) {
        if (!this.userLocks.has(userId)) {
            this.userLocks.set(userId, Promise.resolve());
        }

        const promise = this.userLocks.get(userId).then(async () => {
            try {
                return await action();
            } catch (err) {
                throw err;
            }
        });

        // Update the lock pointer, catching errors to keep the chain alive
        this.userLocks.set(userId, promise.catch(() => { }));

        return promise;
    }

    async init() {
        try {
            await this.refundActiveBets();

            const results = await GameResult.find().sort({ createdAt: -1 }).limit(HISTORY_LIMIT);
            this.history = results.reverse().map(r => ({ number: r.number, color: r.color }));

            // Get the highest round number from DB to continue counting
            const lastResult = await GameResult.findOne().sort({ roundNumber: -1 });
            // Initialize to next round number (last + 1), or 1 if no history
            this.roundNumber = (lastResult && typeof lastResult.roundNumber === 'number') ? lastResult.roundNumber + 1 : 1;

            // Generate initial Round ID
            this.currentRoundId = await this.generateRoundId();

            logger.info(`Loaded ${this.history.length} past results, starting at round ${this.roundNumber} (ID: ${this.currentRoundId})`);

            this.startLoop();
        } catch (err) {
            logger.error("Failed to initialize GameLoop:", err);
            // Retry initialization after delay
            logger.info("Retrying GameLoop initialization in 5 seconds...");
            setTimeout(() => this.init(), 5000);
        }
    }

    // Generate sequential daily round ID (YYYYMMDD-XXXX)
    async generateRoundId() {
        try {
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

            // Try to atomically look for today's stats and increment
            let stats = await GameStats.findOneAndUpdate(
                { lastDate: dateStr },
                { $inc: { dailyNonce: 1 } },
                { new: true }
            );

            if (!stats) {
                // If no stats for today (or global stats empty/old date), reset
                // Use findOneAndUpdate with upsert to handle concurrency implicitly if multiple servers (though logic here favors last write)
                // but we check lastDate filter.

                // First, try to update if it WAS old date (atomic reset)
                stats = await GameStats.findOneAndUpdate(
                    { lastDate: { $ne: dateStr } },
                    { $set: { lastDate: dateStr, dailyNonce: 1 } },
                    { new: true }
                );

                // If still null, it means either:
                // 1. Another process updated it to today concurrently (so filter lastDate != dateStr failed).
                // 2. Doc doesn't exist at all.

                if (!stats) {
                    // Try to fetch existing or create
                    stats = await GameStats.findOne();
                    if (!stats) {
                        // Create
                        stats = await GameStats.create({ lastDate: dateStr, dailyNonce: 1 });
                    } else if (stats.lastDate === dateStr) {
                        // Concurrent update happened, just increment
                        stats = await GameStats.findOneAndUpdate(
                            { lastDate: dateStr },
                            { $inc: { dailyNonce: 1 } },
                            { new: true }
                        );
                    } else {
                        // Should have been caught by atomic reset... retry recursion once?
                        // Just force update
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

                // Log Transaction
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

        setInterval(() => {
            this.tick();
        }, 1000);
    }

    tick() {
        const now = Date.now();
        const timeLeft = Math.max(0, (this.endTime - now) / 1000);

        if (this.state === GAME_STATES.WAITING) {
            if (timeLeft <= 0) {
                this.spin();
            }
        } else if (this.state === GAME_STATES.RESULT) {
            // Wait for processing to be explicitly false before resetting
            if (timeLeft <= 0 && !this.processing) {
                this.reset();
            }
        }

        // Broadcast state every second (or on change)
        this.broadcastUpdate();
    }

    broadcastUpdate() {
        socketService.emitToAll('gameUpdate', {
            state: this.state,
            endTime: this.endTime,
            result: this.state === GAME_STATES.RESULT ? this.result : null,
            targetResult: this.state === GAME_STATES.SPINNING ? this.result : null
        });
    }

    broadcastState() {
        socketService.emitToAll('gameState', {
            state: this.state,
            endTime: this.endTime, // Send timestamp instead of duration
            bets: this.bets,
            history: this.history,
            result: this.state === GAME_STATES.RESULT ? this.result : null,
            targetResult: this.state === GAME_STATES.SPINNING ? this.result : null
        });
    }


    spin() {
        // Set processing flag early to prevent race conditions with tick()
        this.processing = true;
        this.state = GAME_STATES.SPINNING;
        this.endTime = Date.now() + TIMING.SPIN_DURATION * 1000;

        // Generate Result
        const resultIndex = secureRandomInt(0, 15);
        this.result = SEGMENTS[resultIndex];

        // Broadcast immediately so clients start animation
        socketService.emitToAll('spinResult', {
            result: this.result,
            endTime: this.endTime
        });

        // Wait for spin to finish then process results
        setTimeout(() => {
            this.processResults();
        }, TIMING.SPIN_DURATION * 1000);
    }

    async processResults() {
        // processing flag is now set in spin() to prevent race conditions



        try {
            this.state = GAME_STATES.RESULT;
            this.endTime = Date.now() + TIMING.RESULT_DURATION * 1000;

            this.history.unshift(this.result);
            if (this.history.length > HISTORY_LIMIT) this.history.pop();

            // Process Bets
            const activeBets = await Bet.find({ status: 'active', roundId: this.currentRoundId });

            // Group bets by user
            const betsByUser = new Map();
            for (const bet of activeBets) {
                const userId = bet.user.toString();
                if (!betsByUser.has(userId)) {
                    betsByUser.set(userId, []);
                }
                betsByUser.get(userId).push(bet);
            }

            // Stats counters for the round
            let roundTotalBets = 0;
            let roundTotalWagered = 0;
            let roundTotalPayout = 0;
            let roundUniqueUsers = 0;

            // Process each user's bets together
            for (const [userId, userBets] of betsByUser) {
                roundUniqueUsers++;
                roundTotalBets += userBets.length;
                // First, calculate winnings for each bet to determine result
                for (const bet of userBets) {
                    let winnings = 0;
                    // Use integer arithmetic to avoid floating-point precision issues
                    if (bet.type === "number" && bet.value === this.result.number) {
                        winnings = Math.floor((bet.amount * PAYOUTS.NUMBER * 100) / 100);
                    } else if (bet.type === "color" && bet.value === this.result.color) {
                        winnings = Math.floor((bet.amount * PAYOUTS.COLOR * 100) / 100);
                    } else if (bet.type === "type") {
                        // Note: 0 (green) loses all even/odd bets - this is standard roulette behavior
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

                // Sort bets: by time to replay history correctly for balance calculation
                userBets.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                // Calculate total winnings for DB update
                const totalWinnings = userBets.reduce((sum, bet) => sum + bet.payout, 0);
                const totalBetAmount = userBets.reduce((sum, bet) => sum + bet.amount, 0);

                roundTotalWagered += totalBetAmount;
                roundTotalPayout += totalWinnings;

                // Update user balance once with total winnings
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

                // Broadcast updates if user exists
                if (updatedUser) {
                    if (totalWinnings > 0) {
                        socketService.emitToUser(userId, 'balanceUpdate', { balance: updatedUser.balance });
                        socketService.emitToRoom('admin-room', 'admin:userUpdate', updatedUser);
                    }
                }

                // Calculate PROGRESSIVE balanceAfter for each bet
                const finalBalance = updatedUser ? updatedUser.balance : 0;
                const initialBalance = finalBalance + totalBetAmount - totalWinnings;
                let runningBalance = initialBalance;

                for (const bet of userBets) {
                    runningBalance -= bet.amount;
                    runningBalance += bet.payout;
                    bet.balanceAfter = runningBalance;
                }

                // Use bulkWrite for efficient batch updates instead of individual saves
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

            // Save Game Result
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

            // Update Global Stats
            await GameStats.findOneAndUpdate({}, {
                $inc: {
                    totalBets: roundTotalBets,
                    totalWagered: roundTotalWagered,
                    netProfit: roundTotalWagered - roundTotalPayout
                }
            }, { upsert: true });

        } catch (err) {
            logger.error("FULL ERROR OBJECT:", err);
            logger.error("Error processing bets:", err);
            // Error occurred. Active bets persist in DB and will be refunded upon server restart via refundActiveBets().
        } finally {
            // Ensure bets array is cleared even on error to prevent memory leaks
            this.bets = [];
            this.broadcastState();
            this.processing = false;
        }
    }

    async reset() {
        this.state = GAME_STATES.WAITING;
        this.endTime = Date.now() + TIMING.WAITING_TIME * 1000;
        this.bets = [];
        this.result = null;
        this.roundNumber++; // Increment round number for next round

        try {
            this.currentRoundId = await this.generateRoundId();
        } catch (e) {
            logger.error("Failed to generate Round ID:", e);
            this.currentRoundId = crypto.randomUUID(); // Fallback
        }

        this.broadcastState();
    }

    async placeBet(user, betData) {
        return this.withUserLock(user.id, async () => {
            if (this.state !== GAME_STATES.WAITING) {
                throw new Error("Betting is closed");
            }

            const { type, value, amount } = betData;

            // Validation using centralized constants
            if (!amount || isNaN(amount) || amount < BET_LIMITS.MIN || !Number.isInteger(amount)) {
                throw new Error(`Invalid bet amount (minimum is ${BET_LIMITS.MIN})`);
            }

            // Validate type and value against constants
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

            // Check max bet amount limit per user per round (maxBetAmount parsed once in constructor)
            const userActiveBets = await Bet.find({ user: user.id, status: 'active', roundId: this.currentRoundId });
            const currentTotalBet = userActiveBets.reduce((sum, b) => sum + b.amount, 0);

            if (currentTotalBet + amount > this.maxBetAmount) {
                const remainingAllowance = this.maxBetAmount - currentTotalBet;
                if (remainingAllowance <= 0) {
                    throw new Error(`Maximum bet limit of ₹${this.maxBetAmount} reached for this round`);
                }
                throw new Error(`Bet exceeds limit. You can only bet ₹${remainingAllowance} more this round (Max: ₹${this.maxBetAmount})`);
            }

            // Atomic check and deduct
            const dbUser = await User.findOneAndUpdate(
                { _id: user.id, balance: { $gte: amount } },
                { $inc: { balance: -amount } },
                { new: true }
            );

            if (!dbUser) {
                throw new Error("Insufficient balance");
            }

            // Create or Update Bet in DB (Aggregate amounts)
            // If a bet exists for this user/round/type/value, increment the amount
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
                        user: user.id, // Ensure user field is set on insert
                        status: 'active',
                        roundId: this.currentRoundId,
                        type,
                        value
                    }
                },
                { new: true, upsert: true }
            );

            // Add to memory for UI
            // Check if bet already exists to aggregate for UI
            const existingBet = this.bets.find(b => b.userId === user.id && b.type === type && b.value === value);

            if (existingBet) {
                existingBet.amount += amount;
                // Aggregate bets in memory for UI presentation only. 
                // DB records track individual bets for settlement.
            } else {
                const bet = {
                    userId: user.id,
                    username: dbUser.username,
                    type,
                    value,
                    amount,
                    _id: newBet._id // Store ID just in case
                };
                this.bets.push(bet);
            }

            const betToEmit = existingBet || this.bets[this.bets.length - 1]; // Use the bet object from memory
            socketService.emitToAll('betPlaced', betToEmit);

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

                // Find user's active bets in DB
                const activeBets = await Bet.find({ user: user.id, status: 'active', roundId: this.currentRoundId });
                if (activeBets.length === 0) return;

                const totalRefund = activeBets.reduce((sum, b) => sum + b.amount, 0);

                // Refund to DB
                await User.findByIdAndUpdate(user.id, { $inc: { balance: totalRefund } });

                // Mark bets as refunded
                await Bet.updateMany(
                    { user: user.id, status: 'active', roundId: this.currentRoundId },
                    { status: 'refunded' }
                );

                // Log Transaction
                const dbUser = await User.findById(user.id);
                const transaction = new Transaction({
                    user: user.id,
                    type: 'adjustment',
                    amount: totalRefund,
                    balanceAfter: dbUser.balance,
                    description: 'Refund: Bets Cleared'
                });
                await transaction.save();

                // Remove bets from memory
                this.bets = this.bets.filter(b => b.userId !== user.id);

                socketService.emitToAll('betsCleared', user.id);

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
