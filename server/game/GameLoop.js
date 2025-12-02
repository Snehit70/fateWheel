const crypto = require('crypto');
const User = require('../models/User');
const Bet = require('../models/Bet');
const GameResult = require('../models/GameResult');

const STATES = {
    WAITING: 'WAITING',
    SPINNING: 'SPINNING',
    RESULT: 'RESULT'
};

const SEGMENTS = [
    { number: 0, color: "green" },
    { number: 1, color: "red" },
    { number: 8, color: "black" },
    { number: 2, color: "red" },
    { number: 9, color: "black" },
    { number: 3, color: "red" },
    { number: 10, color: "black" },
    { number: 4, color: "red" },
    { number: 11, color: "black" },
    { number: 5, color: "red" },
    { number: 12, color: "black" },
    { number: 6, color: "red" },
    { number: 13, color: "black" },
    { number: 7, color: "red" },
    { number: 14, color: "black" },
];

class GameLoop {
    constructor(io) {
        this.io = io;
        this.state = STATES.WAITING;
        this.bets = []; // { userId, username, type, value, amount }
        this.history = [];
        this.timeLeft = 20; // Seconds (Waiting time)
        this.result = null;

        this.init();
        this.startLoop();
    }

    async init() {
        try {
            const results = await GameResult.find().sort({ createdAt: -1 }).limit(20);
            this.history = results.reverse().map(r => ({ number: r.number, color: r.color }));
            console.log(`Loaded ${this.history.length} past results`);
        } catch (err) {
            console.error("Failed to load game history:", err);
        }
    }

    startLoop() {
        setInterval(() => {
            this.tick();
        }, 1000);
    }

    tick() {
        if (this.state === STATES.WAITING) {
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.spin();
            }
        } else if (this.state === STATES.RESULT) {
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.reset();
            }
        }

        // Broadcast state every second (or on change)
        this.broadcastState();
    }

    broadcastState() {
        this.io.emit('gameState', {
            state: this.state,
            timeLeft: this.timeLeft,
            bets: this.bets,
            history: this.history,
            result: this.result
        });
    }

    secureRandomInt(min, max) {
        const range = max - min;
        const bytesNeeded = Math.ceil(Math.log2(range) / 8);
        const maxBytes = Math.pow(256, bytesNeeded);
        const keep = maxBytes - (maxBytes % range);

        while (true) {
            const buffer = crypto.randomBytes(bytesNeeded);
            let value = 0;
            for (let i = 0; i < bytesNeeded; i++) {
                value = (value << 8) + buffer[i];
            }
            if (value < keep) {
                return min + (value % range);
            }
        }
    }

    spin() {
        this.state = STATES.SPINNING;
        this.timeLeft = 5; // Spin duration (animation time)

        // Generate Result
        const resultIndex = this.secureRandomInt(0, 15);
        this.result = SEGMENTS[resultIndex];

        // Broadcast immediately so clients start animation
        this.io.emit('spinResult', {
            result: this.result,
            duration: this.timeLeft * 1000
        });

        // Wait for spin to finish then process results
        setTimeout(() => {
            this.processResults();
        }, this.timeLeft * 1000);
    }

    async processResults() {
        this.state = STATES.RESULT;
        this.timeLeft = 5; // Show result for 5 seconds

        this.history.unshift(this.result);
        if (this.history.length > 20) this.history.pop();

        // Payout Winners
        for (const bet of this.bets) {
            let winnings = 0;
            if (bet.type === "number" && bet.value === this.result.number) {
                winnings = bet.amount * 14;
            } else if (bet.type === "color" && bet.value === this.result.color) {
                winnings = bet.amount * 2;
            } else if (bet.type === "type") {
                if (bet.value === "even" && this.result.number !== 0 && this.result.number % 2 === 0) {
                    winnings = bet.amount * 2;
                } else if (bet.value === "odd" && this.result.number !== 0 && this.result.number % 2 !== 0) {
                    winnings = bet.amount * 2;
                }
            }

            if (winnings > 0) {
                try {
                    await User.findByIdAndUpdate(bet.userId, { $inc: { balance: winnings } });
                    // Notify individual user of win
                    const updatedUser = await User.findById(bet.userId);
                    this.io.to(`user:${bet.userId}`).emit('balanceUpdate', { balance: updatedUser.balance });
                } catch (err) {
                    console.error("Payout error:", err);
                }
            }

            // Save Bet History
            try {
                const newBet = new Bet({
                    user: bet.userId,
                    username: bet.username,
                    type: bet.type,
                    value: bet.value,
                    amount: bet.amount,
                    result: winnings > 0 ? 'win' : 'loss',
                    payout: winnings,
                    gameResult: {
                        number: this.result.number,
                        color: this.result.color
                    }
                });
                await newBet.save();
            } catch (err) {
                console.error("Error saving bet history:", err);
            }
        }

        // Save Game Result
        try {
            const gameResult = new GameResult({
                number: this.result.number,
                color: this.result.color
            });
            await gameResult.save();
        } catch (err) {
            console.error("Error saving game result:", err);
        }

        this.broadcastState();
    }

    reset() {
        this.state = STATES.WAITING;
        this.timeLeft = 20;
        this.bets = [];
        this.result = null;
        this.broadcastState();
    }

    async placeBet(user, betData) {
        if (this.state !== STATES.WAITING || this.timeLeft <= 1) {
            throw new Error("Betting is closed");
        }

        const { type, value, amount } = betData;

        if (!amount || isNaN(amount) || amount <= 0) {
            throw new Error("Invalid bet amount");
        }

        // Validate Balance
        // Atomic check and deduct
        const dbUser = await User.findOneAndUpdate(
            { _id: user.id, balance: { $gte: amount } },
            { $inc: { balance: -amount } },
            { new: true }
        );

        if (!dbUser) {
            throw new Error("Insufficient balance");
        }

        // Check if bet already exists
        const existingBet = this.bets.find(b => b.userId === user.id && b.type === type && b.value === value);

        if (existingBet) {
            existingBet.amount += amount;
        } else {
            const bet = {
                userId: user.id,
                username: dbUser.username,
                type,
                value,
                amount
            };
            this.bets.push(bet);
        }

        this.broadcastState(); // Update everyone with new bet
        return dbUser.balance - amount;
    }

    async clearBets(user) {
        if (this.state !== STATES.WAITING) {
            throw new Error("Cannot clear bets now");
        }

        // Find user's bets
        const userBets = this.bets.filter(b => b.userId === user.id);
        if (userBets.length === 0) return;

        // Calculate total refund
        const totalRefund = userBets.reduce((sum, b) => sum + b.amount, 0);

        // Refund to DB
        await User.findByIdAndUpdate(user.id, { $inc: { balance: totalRefund } });

        // Remove bets from memory
        this.bets = this.bets.filter(b => b.userId !== user.id);

        this.broadcastState();

        // Return new balance
        const dbUser = await User.findById(user.id);
        return dbUser.balance;
    }
}

module.exports = GameLoop;
