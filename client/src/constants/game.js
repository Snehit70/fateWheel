export const COLORS = {
    GREEN: 'green',
    RED: 'red',
    BLACK: 'black'
};

export const SEGMENTS = [
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

export const PAYOUTS = {
    NUMBER: parseInt(import.meta.env.VITE_PAYOUT_NUMBER) || 14,
    COLOR: parseInt(import.meta.env.VITE_PAYOUT_COLOR) || 2,
    TYPE: parseInt(import.meta.env.VITE_PAYOUT_TYPE) || 2 // Even/Odd
};

export const TIMING = {
    WAITING_TIME: parseInt(import.meta.env.VITE_GAME_WAITING_TIME) || 60, // seconds
    SPIN_DURATION: parseInt(import.meta.env.VITE_GAME_SPIN_DURATION) || 5, // seconds
    RESULT_DURATION: parseInt(import.meta.env.VITE_GAME_RESULT_DURATION) || 5 // seconds
};

export const SEGMENT_ANGLE = 360 / SEGMENTS.length;

export const ANIMATION = {
    ROTATION_SPEED: parseInt(import.meta.env.VITE_ANIMATION_ROTATION_SPEED) || 15,
    EXTRA_SPINS: parseInt(import.meta.env.VITE_ANIMATION_EXTRA_SPINS) || 5,
    SPIN_MIN_DURATION: 1000, // 1 second minimum
    SPIN_MAX_DURATION: 10000, // 10 second maximum safety cap
    SAFETY_TIMEOUT_BUFFER: 2000 // Buffer for safety timeout
};

export const getNumbersByColor = (color) => {
    return SEGMENTS.filter(s => s.color === color).map(s => s.number);
};

export const BET_LIMITS = {
    MIN: parseInt(import.meta.env.VITE_MIN_BET_AMOUNT) || 11,
    MAX: parseInt(import.meta.env.VITE_MAX_BET_AMOUNT) || 1001
};
