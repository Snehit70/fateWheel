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
const Bet = require('../models/Bet');
const AdminLog = require('../models/AdminLog');

// @route   GET api/admin/logs
// @desc    Get admin action logs
// @access  Admin
router.get('/logs', auth, admin, async (req, res) => {
    try {
        const logs = await AdminLog.find()
            .populate('adminId', 'username')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(logs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/stats
// @desc    Get dashboard stats
// @access  Admin
router.get('/stats', auth, admin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
        const pendingUsers = await User.countDocuments({ status: 'pending' });

        // Calculate Net Profit (Total Deposits - Total Withdrawals)
        // Or simpler: Total User Losses - Total User Wins
        // For now, let's use: Total Deposits - Total Withdrawals based on Transactions
        // Calculate Net Profit using Bets
        // Net Profit = Total Bets Amount - Total Payouts
        const betStats = await Bet.aggregate([
            {
                $match: { status: { $ne: 'refunded' } }
            },
            {
                $group: {
                    _id: null,
                    totalBets: { $sum: '$amount' },
                    totalPayouts: { $sum: '$payout' }
                }
            }
        ]);

        const netProfit = betStats.length > 0
            ? betStats[0].totalBets - betStats[0].totalPayouts
            : 0;

        res.json({
            totalUsers,
            pendingUsers,
            netProfit
        });
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
        const { balance: rawBalance, reason } = req.body;
        const balance = Math.floor(rawBalance);

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ msg: 'Reason is required' });
        }

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
                details: `Changed balance from ${oldUser.balance} to ${balance} (${difference > 0 ? '+' : ''}${difference}). Reason: ${reason}`
            });
            await log.save();

            // Emit new log
            const populatedLog = await AdminLog.findById(log._id).populate('adminId', 'username');
            req.io.to('admin-room').emit('admin:newLog', populatedLog);
        }

        // Emit balance update to user
        req.io.to(`user:${user._id}`).emit('balanceUpdate', { balance: user.balance });

        // Emit update to admin panel
        req.io.to('admin-room').emit('admin:userUpdate', user);

        // Emit new log
        // This block was added by mistake in previous step, removing it to avoid duplication/errors
        // if (difference !== 0) { ... } 

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

        // Emit user deleted event
        req.io.to('admin-room').emit('admin:userDeleted', user._id);

        // Emit new log
        const populatedLog = await AdminLog.findById(log._id).populate('adminId', 'username');
        req.io.to('admin-room').emit('admin:newLog', populatedLog);

        // Emit stats update (since user count changed)
        // We can just trigger a stats refresh on client or emit the new stats.
        // Let's emit a signal to refresh stats.
        req.io.to('admin-room').emit('admin:statsUpdate');

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

        // Emit new log
        const populatedLog = await AdminLog.findById(log._id).populate('adminId', 'username');
        req.io.to('admin-room').emit('admin:newLog', populatedLog);

        // Emit stats update (pending count might have changed)
        req.io.to('admin-room').emit('admin:statsUpdate');

        // Emit update to admin panel
        req.io.to('admin-room').emit('admin:userUpdate', user);

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
