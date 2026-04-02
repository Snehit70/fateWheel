const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const COLORS = {
  GREEN: 'green',
  RED: 'red',
  BLACK: 'black',
} as const;

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
] as const;

export const PAYOUTS = {
  NUMBER: parsePositiveInteger(process.env.PAYOUT_NUMBER, 14),
  COLOR: parsePositiveInteger(process.env.PAYOUT_COLOR, 2),
  TYPE: parsePositiveInteger(process.env.PAYOUT_TYPE, 2),
} as const;

export const TIMING = {
  WAITING_TIME: parsePositiveInteger(process.env.GAME_WAITING_TIME, 60),
  SPIN_DURATION: parsePositiveInteger(process.env.GAME_SPIN_DURATION, 5),
  RESULT_DURATION: parsePositiveInteger(process.env.GAME_RESULT_DURATION, 5),
} as const;

export const BET_LIMITS = {
  MIN: parsePositiveInteger(process.env.MIN_BET_AMOUNT, 10),
  MAX: parsePositiveInteger(process.env.MAX_BET_AMOUNT, 1000),
} as const;

export const BET_TYPES = {
  EVEN: 'even',
  ODD: 'odd',
} as const;

export const NUMBER_RANGE = {
  MIN: Math.min(...SEGMENTS.map(s => s.number)),
  MAX: Math.max(...SEGMENTS.map(s => s.number)),
} as const;
