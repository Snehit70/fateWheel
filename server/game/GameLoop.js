const crypto = require('crypto');
const User = require('../models/User');
const Bet = require('../models/Bet');
const GameResult = require('../models/GameResult');
const Transaction = require('../models/Transaction');
const { STATES, SEGMENTS, PAYOUTS, TIMING } = require('../constants/game');
const logger = require('../utils/logger');
const { secureRandomInt } = require('../utils/random');

// Map constants to local variables for easier usage if needed, or use directly
const GAME_STATES = {
    WAITING: 'WAITING',
    SPINNING: 'SPINNING',
    RESULT: 'RESULT'
};

class GameLoop {
    constructor(io) {
        this.io = io;
        this.state = GAME_STATES.WAITING;
        this.bets = []; // Cache for UI, but source of truth is DB for money
        this.history = [];
        this.endTime = 0; // Timestamp for current phase end
        this.result = null;
        this.currentRoundId = crypto.randomUUID();

        this.init();
        this.startLoop();
    }

    async init() {
        try {
            const results = await GameResult.find().sort({ createdAt: -1 }).limit(20);
            this.history = results.reverse().map(r => ({ number: r.number, color: r.color }));
            logger.info(`Loaded ${this.history.length} past results`);
        } catch (err) {
            logger.error("Failed to load game history:", err);
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

                this.io.to('admin-room').emit('admin:userUpdate', updatedUser);
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
            if (timeLeft <= 0) {
                this.reset();
            }
        }

        // Broadcast state every second (or on change)
        this.broadcastState();
    }

    broadcastState() {
        this.io.emit('gameState', {
            state: this.state,
            endTime: this.endTime, // Send timestamp instead of duration
            bets: this.bets,
            history: this.history,
            result: this.state === GAME_STATES.RESULT ? this.result : null,
            targetResult: this.state === GAME_STATES.SPINNING ? this.result : null
        });
    }

    // secureRandomInt moved to utils/random.js

    spin() {
        this.state = GAME_STATES.SPINNING;
        this.endTime = Date.now() + TIMING.SPIN_DURATION * 1000;

        // Generate Result
        const resultIndex = secureRandomInt(0, 15);
        this.result = SEGMENTS[resultIndex];

        // Broadcast immediately so clients start animation
        this.io.emit('spinResult', {
            result: this.result,
            endTime: this.endTime
        });

        // Wait for spin to finish then process results
        setTimeout(() => {
            this.processResults();
        }, TIMING.SPIN_DURATION * 1000);
    }

    async processResults() {
        this.state = GAME_STATES.RESULT;
        this.endTime = Date.now() + TIMING.RESULT_DURATION * 1000;

        this.history.unshift(this.result);
        if (this.history.length > 20) this.history.pop();

        // Process Bets
        // We iterate through DB records to ensure we process every active bet for this round
        try {
            const activeBets = await Bet.find({ status: 'active', roundId: this.currentRoundId });

            for (const bet of activeBets) {
                let winnings = 0;
                if (bet.type === "number" && bet.value === this.result.number) {
                    winnings = Math.floor(bet.amount * PAYOUTS.NUMBER);
                } else if (bet.type === "color" && bet.value === this.result.color) {
                    winnings = Math.floor(bet.amount * PAYOUTS.COLOR);
                } else if (bet.type === "type") {
                    if (bet.value === "even" && this.result.number !== 0 && this.result.number % 2 === 0) {
                        winnings = Math.floor(bet.amount * PAYOUTS.TYPE);
                    } else if (bet.value === "odd" && this.result.number !== 0 && this.result.number % 2 !== 0) {
                        winnings = Math.floor(bet.amount * PAYOUTS.TYPE);
                    }
                }

                // 1. Update Bet Status to 'completed' FIRST to prevent double payout on crash
                // If we crash after this but before balance update, user loses win (better than double payout)
                // In a real system, we'd use transactions or a 'payout_pending' state with a recovery worker.
                bet.status = 'completed';
                bet.result = winnings > 0 ? 'win' : 'loss';
                bet.payout = winnings;
                bet.gameResult = {
                    number: this.result.number,
                    color: this.result.color
                };
                await bet.save();

                // 2. Update User Balance
                if (winnings > 0) {
                    const updatedUser = await User.findByIdAndUpdate(
                        bet.user,
                        { $inc: { balance: winnings } },
                        { new: true }
                    );

                    // Notify individual user of win
                    this.io.to(`user:${bet.user}`).emit('balanceUpdate', { balance: updatedUser.balance });
                    this.io.to('admin-room').emit('admin:userUpdate', updatedUser);
                }
            }
        } catch (err) {
            logger.error("Error processing bets:", err);
        }

        // Save Game Result
        try {
            const gameResult = new GameResult({
                number: this.result.number,
                color: this.result.color
            });
            await gameResult.save();
        } catch (err) {
            logger.error("Error saving game result:", err);
        }

        this.broadcastState();
    }

    reset() {
        this.state = GAME_STATES.WAITING;
        this.endTime = Date.now() + TIMING.WAITING_TIME * 1000;
        this.bets = [];
        this.result = null;
        this.currentRoundId = crypto.randomUUID();
        this.broadcastState();
    }

    async placeBet(user, betData) {
        if (this.state !== GAME_STATES.WAITING) {
            throw new Error("Betting is closed");
        }

        const { type, value, amount } = betData;

        // Validation
        if (!amount || isNaN(amount) || amount <= 0 || !Number.isInteger(amount)) {
            throw new Error("Invalid bet amount (must be a whole number)");
        }

        // Validate type and value against constants
        const VALID_TYPES = ['number', 'color', 'type'];
        if (!VALID_TYPES.includes(type)) {
            throw new Error("Invalid bet type");
        }

        if (type === 'number') {
            if (!Number.isInteger(value) || value < 0 || value > 14) {
                throw new Error("Invalid number bet (must be 0-14)");
            }
        } else if (type === 'color') {
            if (!['red', 'black', 'green'].includes(value)) {
                throw new Error("Invalid color bet");
            }
        } else if (type === 'type') {
            if (!['even', 'odd'].includes(value)) {
                throw new Error("Invalid type bet (must be even or odd)");
            }
        }

        // Check max bet amount limit per user per round
        const MAX_BET_AMOUNT = parseInt(process.env.MAX_BET_AMOUNT, 10) || 1000;
        const userActiveBets = await Bet.find({ user: user.id, status: 'active', roundId: this.currentRoundId });
        const currentTotalBet = userActiveBets.reduce((sum, b) => sum + b.amount, 0);

        if (currentTotalBet + amount > MAX_BET_AMOUNT) {
            const remainingAllowance = MAX_BET_AMOUNT - currentTotalBet;
            if (remainingAllowance <= 0) {
                throw new Error(`Maximum bet limit of ₹${MAX_BET_AMOUNT} reached for this round`);
            }
            throw new Error(`Bet exceeds limit. You can only bet ₹${remainingAllowance} more this round (Max: ₹${MAX_BET_AMOUNT})`);
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

        // Create Bet in DB (Active)
        const newBet = new Bet({
            user: user.id,
            username: dbUser.username,
            type,
            value,
            amount,
            status: 'active',
            roundId: this.currentRoundId
        });
        await newBet.save();

        // Add to memory for UI
        // Check if bet already exists to aggregate for UI
        const existingBet = this.bets.find(b => b.userId === user.id && b.type === type && b.value === value);

        if (existingBet) {
            existingBet.amount += amount;
            // We don't update the _id of the existing aggregated bet, 
            // but we need to track the individual bets for status updates?
            // Actually, for the crash recovery, we just need the DB records.
            // For processResults, we iterate this.bets.
            // If we aggregate, we lose the individual bet IDs.
            // So we should probably NOT aggregate in `this.bets` if we want to update specific bet docs.
            // OR we update all active bets for this user/round in processResults.

            // Let's keep aggregation for UI, but for DB updates in processResults, 
            // we should query the DB for active bets for this round.
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

        this.broadcastState();
        this.io.to('admin-room').emit('admin:userUpdate', dbUser);
        return dbUser.balance;
    }

    async clearBets(user) {
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

        this.broadcastState();


        this.io.to('admin-room').emit('admin:userUpdate', dbUser);
        return dbUser.balance;
    }
}

module.exports = GameLoop;
