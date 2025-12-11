const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Bet = require('../models/Bet');
const crypto = require('crypto');
const { secureRandomInt } = require('../utils/random');

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

// secureRandomInt moved to utils/random.js

const Transaction = require('../models/Transaction');

// @route   GET api/game/history
// @desc    Get recent game history for the logged-in user
// @access  Private
router.get('/history', auth, async (req, res) => {
    try {
        let limit = parseInt(req.query.limit) || 20;
        if (limit < 1) limit = 20;

        const bets = await Bet.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const transactions = await Transaction.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        // Combine and sort
        const history = [...bets, ...transactions].sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Slice again to respect the limit after merging
        // (Since we fetched 'limit' of each, we might have 2*limit items)
        const finalHistory = history.slice(0, limit);

        res.json(finalHistory);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
