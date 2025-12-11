const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GameStats = require('../models/GameStats');
const { authLimiter } = require('../middleware/rateLimiter');
const { validatePassword } = require('../utils/validation');

// Register
router.post('/register', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!validatePassword(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters and include at least one number and one special character' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = new User({
            username,
            password: hashedPassword
        });

        try {
            await user.save();
        } catch (saveErr) {
            // Check for MongoDB Duplicate Key Error (E11000)
            if (saveErr.code === 11000) {
                return res.status(400).json({ message: 'User already exists' });
            }
            throw saveErr;
        }

        // Update stats
        await GameStats.findOneAndUpdate({}, { $inc: { totalUsers: 1 } });

        // Emit new user event to admin
        if (req.io) {
            req.io.to('admin-room').emit('admin:newUser', user);
            req.io.to('admin-room').emit('admin:statsUpdate');
        }

        res.json({ message: 'Registration successful. Please wait for admin approval.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check status
        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Account pending approval' });
        }
        if (user.status === 'rejected') {
            return res.status(403).json({ message: 'Account rejected' });
        }

        // Update last login
        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

        // Create token
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, username: user.username, balance: user.balance, role: user.role } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get User
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        // Return consistent format with login response (id instead of _id)
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
