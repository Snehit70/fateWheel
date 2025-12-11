const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');

// @route   GET api/admin/users
// @desc    Get all users
// @access  Admin
router.get('/users', auth, admin, async (req, res) => {
    try {
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit) || 20;

        // If page is provided, return paginated structure
        if (page) {
            const skip = (page - 1) * limit;
            const [users, total] = await Promise.all([
                User.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
                User.countDocuments()
            ]);

            return res.json({
                data: users,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            });
        }

        // Backward compatibility / "No Max" request
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
const GameStats = require('../models/GameStats');

// @route   GET api/admin/logs
// @desc    Get admin action logs
// @access  Admin
router.get('/logs', auth, admin, async (req, res) => {
    try {
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit) || 100;

        if (page) {
            const skip = (page - 1) * limit;
            const [logs, total] = await Promise.all([
                AdminLog.find()
                    .populate('adminId', 'username')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                AdminLog.countDocuments()
            ]);

            return res.json({
                data: logs,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            });
        }

        const logs = await AdminLog.find()
            .populate('adminId', 'username')
            .sort({ createdAt: -1 })
            .limit(limit); // Use limit from query even if not paginating structure
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
        const stats = await GameStats.getStats();
        res.json(stats);
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
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { balance: rawBalance, reason } = req.body;
        const balance = Math.floor(rawBalance);

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ msg: 'Reason is required' });
        }

        // Get old user to calculate difference
        const oldUser = await User.findById(req.params.id).session(session);
        if (!oldUser) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ msg: 'User not found' });
        }

        const difference = balance - oldUser.balance;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { balance: balance },
            { new: true, session }
        ).select('-password');

        // Log Transaction
        if (difference !== 0) {
            const transaction = new Transaction({
                user: user._id,
                type: difference > 0 ? 'deposit' : 'withdraw',
                amount: Math.abs(difference),
                balanceAfter: user.balance,
                description: `Admin ${difference > 0 ? 'added' : 'removed'} funds`
            });
            await transaction.save({ session });

            // Log Admin Action
            const log = new AdminLog({
                adminId: req.user.id,
                action: 'update_balance',
                targetUserId: user._id,
                targetUsername: user.username,
                details: `Changed balance from ${oldUser.balance} to ${balance} (${difference > 0 ? '+' : ''}${difference}). Reason: ${reason}`
            });
            await log.save({ session });

            // Emit new log (Must be done AFTER commit to be safe, but data needed now)
            // We can emit after commit block.
        }

        await session.commitTransaction();
        session.endSession();

        // Socket events (outside transaction)
        if (difference !== 0) {
            // We need to re-fetch logs to populate? Or just construct it.
            // Best to construct or fetch.
            // For simplicity, we won't emit the populated log here perfectly or we fetch it.
            // Actually, let's fetch the latest log to emit.
            const latestLog = await AdminLog.findOne({ adminId: req.user.id, action: 'update_balance' }).sort({ createdAt: -1 }).populate('adminId', 'username');
            if (latestLog) req.io.to('admin-room').emit('admin:newLog', latestLog);
        }

        req.io.to(`user:${user._id}`).emit('balanceUpdate', { balance: user.balance });
        req.io.to('admin-room').emit('admin:userUpdate', user);

        res.json(user);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/users/:id', auth, admin, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Delete user
        await User.findByIdAndDelete(userId);

        // Cleanup associated data
        await Bet.deleteMany({ user: userId });
        await Transaction.deleteMany({ user: userId });

        // Log Admin Action
        const log = new AdminLog({
            adminId: req.user.id,
            action: 'delete_user',
            targetUserId: user._id,
            targetUsername: user.username,
            details: 'Deleted user and all associated history'
        });
        await log.save();

        req.io.to('admin-room').emit('admin:userDeleted', user._id);

        const populatedLog = await AdminLog.findById(log._id).populate('adminId', 'username');
        req.io.to('admin-room').emit('admin:newLog', populatedLog);

        req.io.to('admin-room').emit('admin:statsUpdate');

        res.json({ msg: 'User and history removed' });
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

const GameResult = require('../models/GameResult');

// @route   GET api/admin/rounds
// @desc    Get all rounds with summary stats
// @access  Admin
router.get('/rounds', auth, admin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;

        // Get all game results ordered by round number descending
        const rounds = await GameResult.find()
            .sort({ roundNumber: -1 })
            .limit(limit)
            .lean();

        // Optimized: Use pre-calculated stats if available. 
        // For old records without stats, we still need to calculate them, but new ones are instant.
        // We can do this concurrently.
        const roundsWithStats = await Promise.all(rounds.map(async (round) => {
            if (round.stats && round.stats.totalBets !== undefined) {
                return round;
            }

            // Fallback for migration: Calculate regarding N+1 (only for old records)
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
