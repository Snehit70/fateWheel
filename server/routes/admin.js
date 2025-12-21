const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');
const socketService = require('../services/socketService');

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

// Logs route removed

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

// @route   GET api/admin/users/:id/history
// @desc    Get user's bet and transaction history
// @access  Admin
router.get('/users/:id/history', auth, admin, async (req, res) => {
    try {
        const userId = req.params.id;

        const bets = await Bet.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const transactions = await Transaction.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        // Combine and sort by date
        const history = [...bets, ...transactions].sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.json(history);
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
            socketService.emitToRoom('admin-room', 'admin:newLog', populatedLog);
        }

        // Emit update to user
        const clientUser = {
            id: user._id,
            username: user.username,
            balance: user.balance,
            role: user.role,
            status: user.status,
            allowPasswordReset: user.allowPasswordReset
        };
        socketService.emitToUser(user._id, 'balanceUpdate', { balance: user.balance });
        socketService.emitToUser(user._id, 'userUpdate', clientUser);

        // Emit update to admin panel
        socketService.emitToRoom('admin-room', 'admin:userUpdate', user);

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
        socketService.emitToRoom('admin-room', 'admin:userDeleted', user._id);

        // Emit new log
        const populatedLog = await AdminLog.findById(log._id).populate('adminId', 'username');
        socketService.emitToRoom('admin-room', 'admin:newLog', populatedLog);

        // Emit stats update
        socketService.emitToRoom('admin-room', 'admin:statsUpdate');

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
        socketService.emitToRoom('admin-room', 'admin:newLog', populatedLog);

        // Emit stats update (pending count might have changed)
        socketService.emitToRoom('admin-room', 'admin:statsUpdate');

        // Emit update to admin panel
        socketService.emitToRoom('admin-room', 'admin:userUpdate', user);

        // Emit update to user
        const clientUser = {
            id: user._id,
            username: user.username,
            balance: user.balance,
            role: user.role,
            status: user.status,
            allowPasswordReset: user.allowPasswordReset
        };
        socketService.emitToUser(user._id, 'userUpdate', clientUser);

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/admin/users/:id/allow-reset
// @desc    Toggle allowPasswordReset for user
// @access  Admin
router.put('/users/:id/allow-reset', auth, admin, async (req, res) => {
    try {
        const { allowPasswordReset } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Only allow toggling for pending or rejected users
        if (user.status === 'approved') {
            return res.status(400).json({ msg: 'Cannot enable password reset for approved users' });
        }

        // Use findByIdAndUpdate to avoid validation errors on partial updates (e.g. missing password)
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { allowPasswordReset: allowPasswordReset },
            { new: true }
        );

        // Update the user variable for logging
        // We can just use the updatedUser
        if (!updatedUser) return res.status(404).json({ msg: 'User not found' });

        // Log Admin Action
        const log = new AdminLog({
            adminId: req.user.id,
            action: 'toggle_reset',
            targetUserId: updatedUser._id,
            targetUsername: updatedUser.username,
            details: `Set allowPasswordReset to ${allowPasswordReset}`
        });
        await log.save();

        // Emit new log
        const populatedLog = await AdminLog.findById(log._id).populate('adminId', 'username');
        socketService.emitToRoom('admin-room', 'admin:newLog', populatedLog);

        // Emit update to admin panel
        socketService.emitToRoom('admin-room', 'admin:userUpdate', updatedUser);

        // Emit update to user (so they know they can reset now if they are online)
        const clientUser = {
            id: updatedUser._id,
            username: updatedUser.username,
            balance: updatedUser.balance,
            role: updatedUser.role,
            status: updatedUser.status,
            allowPasswordReset: updatedUser.allowPasswordReset
        };
        socketService.emitToUser(updatedUser._id, 'userUpdate', clientUser);

        res.json(updatedUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

const GameResult = require('../models/GameResult');

// @route   GET api/admin/rounds
// @desc    Get all rounds with summary stats
// @access  Admin
router.get('/rounds', auth, admin, async (req, res) => {
    try {
        // Get all game results ordered by round number descending
        const rounds = await GameResult.find()
            .sort({ roundNumber: -1 })
            .limit(100)
            .lean();

        // For each round, calculate betting stats
        const roundsWithStats = await Promise.all(rounds.map(async (round) => {
            const bets = await Bet.find({ roundId: round.roundId }).lean();

            const totalBets = bets.length;
            const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0);
            const totalPayout = bets.reduce((sum, b) => sum + (b.payout || 0), 0);
            const netProfit = totalWagered - totalPayout;
            const uniqueUsers = new Set(bets.map(b => b.user?.toString())).size;

            return {
                ...round,
                stats: {
                    totalBets,
                    totalWagered,
                    totalPayout,
                    netProfit,
                    uniqueUsers
                }
            };
        }));

        res.json(roundsWithStats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/rounds/:roundId
// @desc    Get detailed round info with all bets
// @access  Admin
router.get('/rounds/:roundId', auth, admin, async (req, res) => {
    try {
        const round = await GameResult.findOne({ roundId: req.params.roundId }).lean();
        if (!round) {
            return res.status(404).json({ msg: 'Round not found' });
        }

        const bets = await Bet.find({ roundId: req.params.roundId })
            .sort({ createdAt: 1 })
            .lean();

        // Calculate stats
        const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0);
        const totalPayout = bets.reduce((sum, b) => sum + (b.payout || 0), 0);
        const netProfit = totalWagered - totalPayout;

        res.json({
            round,
            bets,
            stats: {
                totalBets: bets.length,
                totalWagered,
                totalPayout,
                netProfit
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
