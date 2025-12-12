const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
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
    if (limit < 1) limit = 20;

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

      const [bets, transactions, betCount, txCount] = await Promise.all([
        Bet.find({ user: req.user.id })
          .sort({ createdAt: -1 })
          .limit(fetchLimit)
          .lean(),
        Transaction.find({ user: req.user.id })
          .sort({ createdAt: -1 })
          .limit(fetchLimit)
          .lean(),
        Bet.countDocuments({ user: req.user.id }),
        Transaction.countDocuments({ user: req.user.id })
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
    const bets = await Bet.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const transactions = await Transaction.find({ user: req.user.id })
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
