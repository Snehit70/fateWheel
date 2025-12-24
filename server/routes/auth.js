const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authLimiter } = require('../middleware/rateLimiter');
const socketService = require('../services/socketService');
const logger = require('../utils/logger');

// Register
router.post('/register', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        // Check if user exists (case-insensitive)
        let user = await User.findOne({
            username: { $regex: new RegExp(`^${username}$`, 'i') }
        });

        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user (force lowercase)
        user = new User({
            username: username.toLowerCase(),
            password: hashedPassword
        });

        await user.save();

        // Emit new user event to admin
        socketService.emitToRoom('admin-room', 'admin:newUser', user);
        socketService.emitToRoom('admin-room', 'admin:statsUpdate');

        res.json({ message: 'Registration successful. Please wait for admin approval.' });
    } catch (err) {
        logger.error('Registration failed', err, { username: req.body?.username });
        res.status(500).send('Server error');
    }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if user exists (case-insensitive)
        const user = await User.findOne({
            username: { $regex: new RegExp(`^${username}$`, 'i') }
        });

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

        // Create token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1y' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, username: user.username, balance: user.balance, role: user.role, status: user.status } });
            }
        );
    } catch (err) {
        logger.error('Login failed', err);
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
        logger.error('Get user failed', err, { userId: req.user?.id });
        res.status(500).send('Server error');
    }
});

module.exports = router;

// Reset Password
router.post('/reset-password', authLimiter, async (req, res) => {
    try {
        const { username, newPassword, confirmPassword } = req.body;

        // Check if passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        // Find user (username stored as lowercase)
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            // Keep generic to prevent enumeration, though username is known in this context usually
            return res.status(400).json({ message: 'User not found' });
        }

        // Check permission
        if (!user.allowPasswordReset) {
            return res.status(403).json({ message: 'Contact admin to reset password' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and disable reset flag
        user.password = hashedPassword;
        user.allowPasswordReset = false;
        await user.save();

        // Emit update to admin panel so the toggle flips off automatically
        socketService.emitToRoom('admin-room', 'admin:userUpdate', user);

        res.json({ message: 'Password reset successful. You can now login.' });
    } catch (err) {
        logger.error('Password reset failed', err, { username: req.body?.username });
        res.status(500).send('Server error');
    }
});
