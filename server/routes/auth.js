const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login and Register are now handled client-side via Supabase.

// Get User
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            id: user.id,
            username: user.username,
            balance: user.balance,
            role: user.role,
            status: user.status
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
