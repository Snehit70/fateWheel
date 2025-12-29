const COLORS = Object.freeze({
  GREEN: "green",
  RED: "red",
  BLACK: "black",
});

// Physical wheel order (not numerical) - matches visual roulette wheel layout
const SEGMENTS = Object.freeze([
  Object.freeze({ number: 0, color: COLORS.GREEN }),
  Object.freeze({ number: 1, color: COLORS.RED }),
  Object.freeze({ number: 8, color: COLORS.BLACK }),
  Object.freeze({ number: 2, color: COLORS.RED }),
  Object.freeze({ number: 9, color: COLORS.BLACK }),
  Object.freeze({ number: 3, color: COLORS.RED }),
  Object.freeze({ number: 10, color: COLORS.BLACK }),
  Object.freeze({ number: 4, color: COLORS.RED }),
  Object.freeze({ number: 11, color: COLORS.BLACK }),
  Object.freeze({ number: 5, color: COLORS.RED }),
  Object.freeze({ number: 12, color: COLORS.BLACK }),
  Object.freeze({ number: 6, color: COLORS.RED }),
  Object.freeze({ number: 13, color: COLORS.BLACK }),
  Object.freeze({ number: 7, color: COLORS.RED }),
  Object.freeze({ number: 14, color: COLORS.BLACK }),
]);

const PAYOUTS = Object.freeze({
  NUMBER: parseInt(process.env.PAYOUT_NUMBER, 10) || 14,
  COLOR: parseInt(process.env.PAYOUT_COLOR, 10) || 2,
  TYPE: parseInt(process.env.PAYOUT_TYPE, 10) || 2, // Even/Odd
});

const TIMING = Object.freeze({
  WAITING_TIME: parseInt(process.env.GAME_WAITING_TIME, 10) || 60, // seconds
  SPIN_DURATION: parseInt(process.env.GAME_SPIN_DURATION, 10) || 5, // seconds
  RESULT_DURATION: parseInt(process.env.GAME_RESULT_DURATION, 10) || 5, // seconds
});

// Bet amount limits - synced with client/src/constants/game.js
const BET_LIMITS = Object.freeze({
  MIN: parseInt(process.env.MIN_BET_AMOUNT, 10) || 10,
  MAX: parseInt(process.env.MAX_BET_AMOUNT, 10) || 1000,
});

// Valid bet types for even/odd bets
const BET_TYPES = Object.freeze({
  EVEN: "even",
  ODD: "odd",
});

// Valid number range derived from SEGMENTS
const NUMBER_RANGE = Object.freeze({
  MIN: Math.min(...SEGMENTS.map(s => s.number)),
  MAX: Math.max(...SEGMENTS.map(s => s.number)),
});

module.exports = {
  COLORS,
  SEGMENTS,
  PAYOUTS,
  TIMING,
  BET_LIMITS,
  BET_TYPES,
  NUMBER_RANGE,
};
