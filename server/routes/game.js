const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Bet = require("../models/Bet");

const Transaction = require("../models/Transaction");

router.get("/healthz", (req, res) => {
  res.json({ status: "running" });
});

// @route   GET api/game/history
// @desc    Get recent game history for the logged-in user
// @access  Private
router.get("/history", auth, async (req, res) => {
  try {
    let page = parseInt(req.query.page);
    let limit = parseInt(req.query.limit) || 20;
    const { date, startDate, endDate, roundId } = req.query;
    console.log('[DEBUG] /history params:', { date, startDate, endDate, roundId });

    if (limit < 1) limit = 20;

    // Build queries
    const betQuery = { user: req.user.id };
    const txQuery = { user: req.user.id };

    if (roundId) {
      // Support partial match (last 4 chars) and case-insensitive
      betQuery.roundId = { $regex: roundId, $options: 'i' };
    }

    if (startDate && endDate) {
      betQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      txQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (date) {
      // Assume date is YYYY-MM-DD. Create UTC range.
      // We match any time within that UTC date.
      // Note: exact matching depends on whether stored dates are UTC (standard Mongoose behavior)
      const start = new Date(date); // YYYY-MM-DD -> UTC midnight
      const end = new Date(date);
      end.setUTCDate(end.getUTCDate() + 1); // Next day UTC midnight

      // Correct logic: >= start AND < end
      betQuery.createdAt = { $gte: start, $lt: end };
      txQuery.createdAt = { $gte: start, $lt: end };
    }

    console.log('[DEBUG] Constructed queries:', JSON.stringify({ betQuery, txQuery }));

    if (page) {
      // Pagination Strategy for Merged Collections:
      // Since we are merging two separate sorted lists (Bets and Transactions),
      // we cannot simply 'skip' on the DB side because we don't know how many
      // items from Collection A fall before the Nth item of Collection B.
      //
      // Solution: Fetch 'page * limit' items from BOTH collections.
      // Merge them, sort them, and then slice the specific page window.
      // This scales linearly with page number but ensures 100% accuracy.

      const fetchLimit = page * limit;

      // If filtering by roundId, transactions are irrelevant
      const txPromise = roundId
        ? Promise.resolve([])
        : Transaction.find(txQuery).sort({ createdAt: -1 }).limit(fetchLimit).lean();

      const txCountPromise = roundId
        ? Promise.resolve(0)
        : Transaction.countDocuments(txQuery);

      const [bets, transactions, betCount, txCount] = await Promise.all([
        Bet.find(betQuery)
          .sort({ createdAt: -1 })
          .limit(fetchLimit)
          .lean(),
        txPromise,
        Bet.countDocuments(betQuery),
        txCountPromise
      ]);

      const combinedTotal = betCount + txCount;

      // Merge and sort
      const history = [...bets, ...transactions].sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // Slice the window for the current page
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const pageData = history.slice(startIndex, endIndex);

      return res.json({
        data: pageData,
        pagination: {
          total: combinedTotal,
          page,
          limit,
          pages: Math.ceil(combinedTotal / limit)
        }
      });
    }

    // Legacy behavior (just limit)
    // Legacy behavior (just limit)
    const bets = await Bet.find(betQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const transactions = roundId
      ? []
      : await Transaction.find(txQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    // Combine and sort
    const history = [...bets, ...transactions].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Slice again to respect the limit after merging
    const finalHistory = history.slice(0, limit);

    res.json(finalHistory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
