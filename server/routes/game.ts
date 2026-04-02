import express, { type Request, type Response } from 'express';

import auth = require('../middleware/auth');
import Bet from '../models/Bet';
import Transaction from '../models/Transaction';
import type { HistoryRecord } from '../types/game';
import logger from '../utils/logger';

const router = express.Router();

type HistoryQuery = {
  page?: string;
  limit?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  roundId?: string;
};

type QueryWithCreatedAt = {
  user: string;
  status?: { $ne: string };
  roundId?: { $regex: string; $options: string };
  createdAt?: { $gte: Date; $lte?: Date; $lt?: Date };
};

router.get('/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'running' });
});

router.get('/history', auth, async (req: Request<unknown, unknown, unknown, HistoryQuery>, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const page = Math.max(1, Number.parseInt(req.query.page ?? '', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit ?? '', 10) || 20));
    const { date, startDate, endDate, roundId } = req.query;

    const betQuery: QueryWithCreatedAt = {
      user: userId,
      status: { $ne: 'cancelled' },
    };
    const txQuery: QueryWithCreatedAt = { user: userId };

    if (roundId) {
      betQuery.roundId = { $regex: roundId, $options: 'i' };
    }

    if (startDate && endDate) {
      betQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      txQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setUTCDate(end.getUTCDate() + 1);

      betQuery.createdAt = { $gte: start, $lt: end };
      txQuery.createdAt = { $gte: start, $lt: end };
    }

    if (req.query.page) {
      const fetchLimit = page * limit;
      const txPromise = roundId
        ? Promise.resolve<HistoryRecord[]>([])
        : Transaction.find(txQuery).sort({ createdAt: -1 }).limit(fetchLimit).lean<HistoryRecord[]>();

      const txCountPromise = roundId ? Promise.resolve(0) : Transaction.countDocuments(txQuery);

      const [bets, transactions, betCount, txCount] = await Promise.all([
        Bet.find(betQuery).sort({ createdAt: -1 }).limit(fetchLimit).lean<HistoryRecord[]>(),
        txPromise,
        Bet.countDocuments(betQuery),
        txCountPromise,
      ]);

      const history = [...bets, ...transactions].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );

      const startIndex = (page - 1) * limit;
      const pageData = history.slice(startIndex, startIndex + limit);
      const combinedTotal = betCount + txCount;

      return res.json({
        data: pageData,
        pagination: {
          total: combinedTotal,
          page,
          limit,
          pages: Math.ceil(combinedTotal / limit),
        },
      });
    }

    const bets = await Bet.find(betQuery).sort({ createdAt: -1 }).limit(limit).lean<HistoryRecord[]>();
    const transactions = roundId
      ? []
      : await Transaction.find(txQuery).sort({ createdAt: -1 }).limit(limit).lean<HistoryRecord[]>();

    const history = [...bets, ...transactions].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );

    return res.json(history.slice(0, limit));
  } catch (err) {
    logger.error('Failed to get game history', err, { userId: req.user?.id });
    return res.status(500).send('Server Error');
  }
});

export = router;
