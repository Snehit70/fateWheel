export const SEGMENTS = [
    { number: 0, color: "green" },
    { number: 1, color: "red" },
    { number: 8, color: "black" },
    { number: 2, color: "red" },
    { number: 9, color: "black" },
    { number: 3, color: "red" },
    { number: 10, color: "black" },
    { number: 4, color: "red" },
    { number: 11, color: "black" },
    { number: 5, color: "red" },
    { number: 12, color: "black" },
    { number: 6, color: "red" },
    { number: 13, color: "black" },
    { number: 7, color: "red" },
    { number: 14, color: "black" },
];

export const SEGMENT_ANGLE = 360 / 15;

export const COLORS = {
    RED: 'red',
    BLACK: 'black',
    GREEN: 'green'
};

export const getSegmentColor = (color) => {
    switch (color) {
        case COLORS.RED: return '#ff3e3e'; // Matching var(--color-primary)
        case COLORS.BLACK: return '#1f1f23'; // Specific roulette black
        case COLORS.GREEN: return '#00e676'; // Matching var(--color-success)
        default: return '#000';
    }
};

export const getNumbersByColor = (color) => {
    return SEGMENTS
        .filter(s => s.color === color)
        .map(s => s.number)
        .sort((a, b) => a - b);
};
