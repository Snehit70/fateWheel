const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const crypto = require('crypto');

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

/**
 * Securely generates a random integer between min (inclusive) and max (exclusive).
 */
function secureRandomInt(min, max) {
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

// @route   POST api/game/spin
// @desc    Place bets and spin the wheel
// @access  Private
router.post('/spin', auth, async (req, res) => {
    try {
        const { bets } = req.body;

        // Input Validation
        if (!Array.isArray(bets) || bets.length === 0) {
            return res.status(400).json({ message: "No bets placed." });
        }

        let totalBetAmount = 0;
        for (const bet of bets) {
            if (typeof bet.amount !== "number" || bet.amount <= 0) {
                return res.status(400).json({ message: "Invalid bet amount." });
            }
            if (!["number", "color"].includes(bet.type)) {
                return res.status(400).json({ message: "Invalid bet type." });
            }
            totalBetAmount += bet.amount;
        }

        // Generate Result
        const resultIndex = secureRandomInt(0, 15);
        const resultSegment = SEGMENTS[resultIndex];

        // Calculate Winnings
        let totalWinnings = 0;
        for (const bet of bets) {
            if (bet.type === "number" && bet.value === resultSegment.number) {
                totalWinnings += bet.amount * 14;
            } else if (bet.type === "color" && bet.value === resultSegment.color) {
                totalWinnings += bet.amount * 2;
            }
        }

        const netChange = totalWinnings - totalBetAmount;

        // Atomic Balance Update
        // We check if balance >= totalBetAmount implicitly by checking if the update succeeds?
        // Actually, we can use a query condition to ensure sufficient balance.

        const user = await User.findOneAndUpdate(
            { _id: req.user.id, balance: { $gte: totalBetAmount } },
            { $inc: { balance: netChange } },
            { new: true }
        );

        if (!user) {
            // Either user not found or insufficient balance
            // Let's check which one
            const checkUser = await User.findById(req.user.id);
            if (!checkUser) {
                return res.status(404).json({ message: "User not found." });
            }
            return res.status(400).json({ message: "Insufficient balance." });
        }

        res.json({
            result: resultSegment,
            winnings: totalWinnings,
            balance: user.balance,
            previousBalance: user.balance - netChange, // Approximation
            totalBetAmount
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
