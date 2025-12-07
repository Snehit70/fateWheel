const COLORS = {
    GREEN: 'green',
    RED: 'red',
    BLACK: 'black'
};

const SEGMENTS = [
    { number: 0, color: COLORS.GREEN },
    { number: 1, color: COLORS.RED },
    { number: 8, color: COLORS.BLACK },
    { number: 2, color: COLORS.RED },
    { number: 9, color: COLORS.BLACK },
    { number: 3, color: COLORS.RED },
    { number: 10, color: COLORS.BLACK },
    { number: 4, color: COLORS.RED },
    { number: 11, color: COLORS.BLACK },
    { number: 5, color: COLORS.RED },
    { number: 12, color: COLORS.BLACK },
    { number: 6, color: COLORS.RED },
    { number: 13, color: COLORS.BLACK },
    { number: 7, color: COLORS.RED },
    { number: 14, color: COLORS.BLACK },
];

const PAYOUTS = {
    NUMBER: 14,
    COLOR: 2,
    TYPE: 2 // Even/Odd
};

const TIMING = {
    WAITING_TIME: parseInt(process.env.GAME_WAITING_TIME, 10) || 60, // seconds
    SPIN_DURATION: parseInt(process.env.GAME_SPIN_DURATION, 10) || 5, // seconds
    RESULT_DURATION: parseInt(process.env.GAME_RESULT_DURATION, 10) || 5 // seconds
};

module.exports = {
    COLORS,
    SEGMENTS,
    PAYOUTS,
    TIMING
};
