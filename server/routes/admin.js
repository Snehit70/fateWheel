const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');

// @route   GET api/admin/users
// @desc    Get all users
// @access  Admin
router.get('/users', auth, admin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

const Transaction = require('../models/Transaction');

const AdminLog = require('../models/AdminLog');

// @route   GET api/admin/logs
// @desc    Get admin action logs
// @access  Admin
router.get('/logs', auth, admin, async (req, res) => {
    try {
        const logs = await AdminLog.find().sort({ createdAt: -1 }).limit(100);
        res.json(logs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/admin/users/:id/balance
// @desc    Update user balance
// @access  Admin
router.put('/users/:id/balance', auth, admin, async (req, res) => {
    try {
        const { balance } = req.body;

        // Get old user to calculate difference
        const oldUser = await User.findById(req.params.id);
        if (!oldUser) return res.status(404).json({ msg: 'User not found' });

        const difference = balance - oldUser.balance;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { balance: balance },
            { new: true }
        ).select('-password');

        // Log Transaction
        if (difference !== 0) {
            const transaction = new Transaction({
                user: user._id,
                type: difference > 0 ? 'deposit' : 'withdraw', // Or 'adjustment'
                amount: Math.abs(difference),
                balanceAfter: user.balance,
                description: `Admin ${difference > 0 ? 'added' : 'removed'} funds`
            });
            await transaction.save();

            // Log Admin Action
            const log = new AdminLog({
                adminId: req.user.id,
                action: 'update_balance',
                targetUserId: user._id,
                targetUsername: user.username,
                details: `Changed balance from ${oldUser.balance} to ${balance} (${difference > 0 ? '+' : ''}${difference})`
            });
            await log.save();
        }

        // Emit balance update to user
        req.io.to(`user:${user._id}`).emit('balanceUpdate', { balance: user.balance });

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/users/:id', auth, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        await User.findByIdAndDelete(req.params.id);

        // Log Admin Action
        const log = new AdminLog({
            adminId: req.user.id,
            action: 'delete_user',
            targetUserId: user._id,
            targetUsername: user.username,
            details: 'Deleted user'
        });
        await log.save();

        res.json({ msg: 'User removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/admin/users/:id/status
// @desc    Update user status
// @access  Admin
router.put('/users/:id/status', auth, admin, async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { new: true }
        ).select('-password');

        // Log Admin Action
        const log = new AdminLog({
            adminId: req.user.id,
            action: status === 'approved' ? 'approve_user' : 'reject_user',
            targetUserId: user._id,
            targetUsername: user.username,
            details: `Updated status to ${status}`
        });
        await log.save();

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
