import express, { type Request, type Response } from 'express';

import admin = require('../middleware/admin');
import auth = require('../middleware/auth');
import AdminLog from '../models/AdminLog';
import Bet from '../models/Bet';
import GameResult from '../models/GameResult';
import Transaction from '../models/Transaction';
import User from '../models/User';
import * as socketService from '../services/socketService';
import type { HistoryRecord } from '../types/game';
import logger from '../utils/logger';

const router = express.Router();

type PaginationQuery = {
  page?: string;
  limit?: string;
};

type AdminLogQuery = PaginationQuery & {
  action?: string;
  userId?: string;
};

type FilterRecord = Record<string, unknown>;
type AggregationTotalRow = { _id: null; total?: number; totalBets?: number; totalPayouts?: number };
type RoundStats = {
  totalBets: number;
  totalWagered: number;
  totalPayout: number;
  netProfit: number;
  uniqueUsers?: number;
};
type LeanBet = HistoryRecord & {
  amount: number;
  payout?: number;
  user?: { toString(): string };
};
type LeanUser = {
  _id: string;
  id?: string;
  username: string;
  balance: number;
  role: string;
};
type LeanRound = {
  roundId: string;
  roundNumber: number;
  number: number;
  color: string;
  createdAt: Date | string;
  stats?: RoundStats;
};

const parsePage = (value: string | undefined): number => Math.max(1, Number.parseInt(value ?? '', 10) || 1);
const parseLimit = (value: string | undefined): number =>
  Math.min(100, Math.max(1, Number.parseInt(value ?? '', 10) || 20));

router.get('/users', auth, admin, async (req: Request<unknown, unknown, unknown, PaginationQuery>, res: Response) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);

    const total = await User.countDocuments();
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<LeanUser[]>();

    return res.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error('Failed to get users', err);
    return res.status(500).send('Server Error');
  }
});

router.get('/logs', auth, admin, async (req: Request<unknown, unknown, unknown, AdminLogQuery>, res: Response) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const { action, userId } = req.query;

    const filter: FilterRecord = {};
    if (action) {
      filter.action = action;
    }
    if (userId) {
      filter.targetUserId = userId;
    }

    const total = await AdminLog.countDocuments(filter);
    const logs = await AdminLog.find(filter)
      .populate('adminId', 'username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error('Failed to get admin logs', err);
    return res.status(500).send('Server Error');
  }
});

router.get('/stats', auth, admin, async (_req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });

    const betStats = await Bet.aggregate<AggregationTotalRow>([
      { $match: { status: { $ne: 'refunded' } } },
      {
        $group: {
          _id: null,
          totalBets: { $sum: '$amount' },
          totalPayouts: { $sum: '$payout' },
        },
      },
    ]);

    const gameProfit =
      betStats.length > 0 ? (betStats[0].totalBets ?? 0) - (betStats[0].totalPayouts ?? 0) : 0;

    const withdrawalStats = await Transaction.aggregate<AggregationTotalRow>([
      {
        $match: {
          type: 'withdraw',
          description: 'Admin Profit Withdrawal',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const totalWithdrawals = withdrawalStats.length > 0 ? withdrawalStats[0].total ?? 0 : 0;

    return res.json({
      totalUsers,
      netProfit: gameProfit - totalWithdrawals,
    });
  } catch (err) {
    logger.error('Failed to get stats', err);
    return res.status(500).send('Server Error');
  }
});

router.get(
  '/users/:id/history',
  auth,
  admin,
  async (req: Request<{ id: string }, unknown, unknown, PaginationQuery>, res: Response) => {
    try {
      const userId = req.params.id;
      const page = parsePage(req.query.page);
      const limit = parseLimit(req.query.limit);

      const [betCount, txCount] = await Promise.all([
        Bet.countDocuments({ user: userId }),
        Transaction.countDocuments({ user: userId }),
      ]);
      const combinedTotal = betCount + txCount;
      const fetchLimit = page * limit;

      const [bets, transactions] = await Promise.all([
        Bet.find({ user: userId }).sort({ createdAt: -1 }).limit(fetchLimit).lean<HistoryRecord[]>(),
        Transaction.find({ user: userId }).sort({ createdAt: -1 }).limit(fetchLimit).lean<HistoryRecord[]>(),
      ]);

      const history = [...bets, ...transactions].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );

      return res.json({
        data: history.slice((page - 1) * limit, (page - 1) * limit + limit),
        pagination: {
          page,
          limit,
          total: combinedTotal,
          pages: Math.ceil(combinedTotal / limit),
        },
      });
    } catch (err) {
      logger.error('Failed to get user history', err, { userId: req.params.id });
      return res.status(500).send('Server Error');
    }
  }
);

router.put('/users/:id/balance', auth, admin, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const rawBalance = req.body?.balance;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : '';
    const balance = Math.floor(Number(rawBalance));

    if (!reason.trim()) {
      return res.status(400).json({ msg: 'Reason is required' });
    }

    const oldUser = await User.findById(req.params.id);
    if (!oldUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const difference = balance - oldUser.balance;

    const user = await User.findByIdAndUpdate(req.params.id, { balance }, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    try {
      if (difference !== 0) {
        const transaction = new Transaction({
          user: user._id,
          type: difference > 0 ? 'deposit' : 'withdraw',
          amount: Math.abs(difference),
          balanceAfter: user.balance,
          description: `Admin ${difference > 0 ? 'added' : 'removed'} funds`,
        });
        await transaction.save();

        const log = new AdminLog({
          adminId: req.user?.id,
          action: 'update_balance',
          targetUserId: user._id,
          targetUsername: user.username,
          details: `Changed balance from ${oldUser.balance} to ${balance} (${difference > 0 ? '+' : ''}${difference})`,
          reason,
        });
        await log.save();

        const populatedLog = await AdminLog.findById(log._id).populate('adminId', 'username');
        socketService.emitToRoom('admin-room', 'admin:newLog', populatedLog);
      }

      const clientUser = {
        id: user._id,
        username: user.username,
        balance: user.balance,
        role: user.role,
      };
      socketService.emitToUser(String(user._id), 'balanceUpdate', { balance: user.balance });
      socketService.emitToUser(String(user._id), 'userUpdate', clientUser);
      socketService.emitToRoom('admin-room', 'admin:userUpdate', user);
    } catch (secondaryErr) {
      logger.error('Failed to perform secondary balance update actions', secondaryErr, { userId: user._id });
    }

    return res.json(user);
  } catch (err) {
    logger.error('Failed to update user balance', err, { userId: req.params.id });
    return res.status(500).send('Server Error');
  }
});

router.delete('/users/:id', auth, admin, async (req: Request<{ id: string }>, res: Response) => {
  try {
    if (req.params.id === req.user?.id) {
      return res.status(400).json({ msg: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    const log = new AdminLog({
      adminId: req.user?.id,
      action: 'delete_user',
      targetUserId: user._id,
      targetUsername: user.username,
      details: 'Deleted user',
    });
    await log.save();

    socketService.emitToRoom('admin-room', 'admin:userDeleted', user._id);

    const populatedLog = await AdminLog.findById(log._id).populate('adminId', 'username');
    socketService.emitToRoom('admin-room', 'admin:newLog', populatedLog);
    socketService.emitToRoom('admin-room', 'admin:statsUpdate', {});

    return res.json({ msg: 'User removed' });
  } catch (err) {
    logger.error('Failed to delete user', err, { userId: req.params.id });
    return res.status(500).send('Server Error');
  }
});

router.get('/rounds', auth, admin, async (req: Request<unknown, unknown, unknown, PaginationQuery>, res: Response) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);

    const total = await GameResult.countDocuments();
    const rounds = await GameResult.find()
      .sort({ roundNumber: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<LeanRound[]>();

    const roundsWithStats = await Promise.all(
      rounds.map(async (round) => {
        const bets = await Bet.find({ roundId: round.roundId }).lean<LeanBet[]>();
        const totalBets = bets.length;
        const totalWagered = bets.reduce((sum, bet) => sum + bet.amount, 0);
        const totalPayout = bets.reduce((sum, bet) => sum + (bet.payout ?? 0), 0);
        const netProfit = totalWagered - totalPayout;
        const uniqueUsers = new Set(bets.map((bet) => bet.user?.toString() ?? '')).size;

        return {
          ...round,
          stats: {
            totalBets,
            totalWagered,
            totalPayout,
            netProfit,
            uniqueUsers,
          },
        };
      })
    );

    return res.json({
      data: roundsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error('Failed to get rounds', err);
    return res.status(500).send('Server Error');
  }
});

router.get('/rounds/:roundId', auth, admin, async (req: Request<{ roundId: string }>, res: Response) => {
  try {
    const round = await GameResult.findOne({ roundId: req.params.roundId }).lean<LeanRound | null>();
    if (!round) {
      return res.status(404).json({ msg: 'Round not found' });
    }

    const bets = await Bet.find({ roundId: req.params.roundId }).sort({ createdAt: 1 }).lean<LeanBet[]>();
    const totalWagered = bets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalPayout = bets.reduce((sum, bet) => sum + (bet.payout ?? 0), 0);

    return res.json({
      round,
      bets,
      stats: {
        totalBets: bets.length,
        totalWagered,
        totalPayout,
        netProfit: totalWagered - totalPayout,
      },
    });
  } catch (err) {
    logger.error('Failed to get round details', err, { roundId: req.params.roundId });
    return res.status(500).send('Server Error');
  }
});

router.post('/withdraw', auth, admin, async (req: Request, res: Response) => {
  try {
    const amount = Number(req.body?.amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({ msg: 'Invalid amount' });
    }

    const betStats = await Bet.aggregate<AggregationTotalRow>([
      { $match: { status: { $ne: 'refunded' } } },
      { $group: { _id: null, total: { $sum: { $subtract: ['$amount', { $ifNull: ['$payout', 0] }] } } } },
    ]);
    const gameProfit = betStats.length > 0 ? betStats[0].total ?? 0 : 0;

    const withdrawalStats = await Transaction.aggregate<AggregationTotalRow>([
      { $match: { type: 'withdraw', description: 'Admin Profit Withdrawal' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalWithdrawals = withdrawalStats.length > 0 ? withdrawalStats[0].total ?? 0 : 0;

    const currentNetProfit = gameProfit - totalWithdrawals;
    if (amount > currentNetProfit) {
      return res.status(400).json({ msg: 'Insufficient Net Profit' });
    }

    const transaction = new Transaction({
      user: req.user?.id,
      type: 'withdraw',
      amount,
      balanceAfter: currentNetProfit - amount,
      description: 'Admin Profit Withdrawal',
    });
    await transaction.save();

    try {
      const log = new AdminLog({
        adminId: req.user?.id,
        action: 'withdraw_profit',
        targetUserId: req.user?.id,
        targetUsername: 'System',
        details: `Withdrew ${amount} from Net Profit`,
        reason: 'Profit Withdrawal',
      });
      await log.save();

      const populatedLog = await AdminLog.findById(log._id).populate('adminId', 'username');
      socketService.emitToRoom('admin-room', 'admin:newLog', populatedLog);
    } catch (logErr) {
      logger.error('Failed to save admin log for withdrawal', logErr);
    }

    socketService.emitToRoom('admin-room', 'admin:statsUpdate', {});

    return res.json({ msg: 'Withdrawal successful', netProfit: currentNetProfit - amount });
  } catch (err) {
    logger.error('Failed to withdraw profit', err);
    return res.status(500).send('Server Error');
  }
});

router.get(
  '/withdrawals',
  auth,
  admin,
  async (req: Request<unknown, unknown, unknown, PaginationQuery>, res: Response) => {
    try {
      const page = parsePage(req.query.page);
      const limit = parseLimit(req.query.limit);

      const filter = {
        type: 'withdraw',
        description: 'Admin Profit Withdrawal',
      };

      const total = await Transaction.countDocuments(filter);
      const withdrawals = await Transaction.find(filter)
        .populate('user', 'username')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return res.json({
        data: withdrawals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      logger.error('Failed to get withdrawals', err);
      return res.status(500).send('Server Error');
    }
  }
);

export = router;
