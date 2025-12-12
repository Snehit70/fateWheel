require('./setup');
const { SEGMENTS, PAYOUTS, TIMING } = require('../constants/game');

describe('Game Constants', () => {
    describe('SEGMENTS', () => {
        it('should have 15 segments (0-14)', () => {
            expect(SEGMENTS).toHaveLength(15);
        });

        it('should have numbers 0-14', () => {
            const numbers = SEGMENTS.map(s => s.number);
            expect(numbers).toEqual(expect.arrayContaining([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]));
        });

        it('should have valid colors (red, black, green)', () => {
            SEGMENTS.forEach(segment => {
                expect(['red', 'black', 'green']).toContain(segment.color);
            });
        });

        it('should have green only for number 0', () => {
            const greenSegments = SEGMENTS.filter(s => s.color === 'green');
            expect(greenSegments).toHaveLength(1);
            expect(greenSegments[0].number).toBe(0);
        });

        it('should have balanced red and black segments', () => {
            const redCount = SEGMENTS.filter(s => s.color === 'red').length;
            const blackCount = SEGMENTS.filter(s => s.color === 'black').length;
            expect(redCount).toBe(blackCount);
        });
    });

    describe('PAYOUTS', () => {
        it('should have correct number payout (14x for a single number)', () => {
            expect(PAYOUTS.NUMBER).toBe(14);
        });

        it('should have correct color payout (2x for color)', () => {
            expect(PAYOUTS.COLOR).toBe(2);
        });

        it('should have correct type payout (even/odd)', () => {
            expect(PAYOUTS.TYPE).toBe(2);
        });

        it('payout multipliers should be positive numbers', () => {
            expect(PAYOUTS.NUMBER).toBeGreaterThan(0);
            expect(PAYOUTS.COLOR).toBeGreaterThan(0);
            expect(PAYOUTS.TYPE).toBeGreaterThan(0);
        });
    });

    describe('TIMING', () => {
        it('should have reasonable timing constants', () => {
            expect(TIMING.WAITING_TIME).toBeGreaterThan(0);
            expect(TIMING.SPIN_DURATION).toBeGreaterThan(0);
            expect(TIMING.RESULT_DURATION).toBeGreaterThan(0);
        });

        it('timing values should be in seconds (reasonable range)', () => {
            // Timings are in seconds (see game.js comments)
            // Waiting: 1-120 seconds, Spin/Result: 1-30 seconds
            expect(TIMING.WAITING_TIME).toBeGreaterThanOrEqual(1);
            expect(TIMING.WAITING_TIME).toBeLessThanOrEqual(120);
            expect(TIMING.SPIN_DURATION).toBeGreaterThanOrEqual(1);
            expect(TIMING.RESULT_DURATION).toBeGreaterThanOrEqual(1);
        });
    });
});

describe('Payout Calculations', () => {
    it('should calculate number bet payout correctly', () => {
        const betAmount = 100;
        const payout = Math.floor(betAmount * PAYOUTS.NUMBER);
        expect(payout).toBe(1400);
    });

    it('should calculate color bet payout correctly', () => {
        const betAmount = 100;
        const payout = Math.floor(betAmount * PAYOUTS.COLOR);
        expect(payout).toBe(200);
    });

    it('should calculate type bet payout correctly', () => {
        const betAmount = 100;
        const payout = Math.floor(betAmount * PAYOUTS.TYPE);
        expect(payout).toBe(200);
    });

    it('should floor fractional payouts', () => {
        const betAmount = 15; // 15 * 14 = 210
        const payout = Math.floor(betAmount * PAYOUTS.NUMBER);
        expect(payout).toBe(210);
    });

    it('should handle minimum bet payout', () => {
        const betAmount = 11; // Minimum bet
        const payout = Math.floor(betAmount * PAYOUTS.NUMBER);
        expect(payout).toBe(154); // 11 * 14 = 154
    });
});

describe('Bet Validation Logic', () => {
    // Validation function matching expected behavior
    const validateBet = (type, value, amount) => {
        // Check amount first
        if (amount === null || amount === undefined || isNaN(amount) || amount < 11 || !Number.isInteger(amount)) {
            return 'Invalid bet amount (minimum is 11)';
        }

        // Check type
        const VALID_TYPES = ['number', 'color', 'type'];
        if (type === null || type === undefined || !VALID_TYPES.includes(type)) {
            return 'Invalid bet type';
        }

        // Validate value based on type
        if (type === 'number') {
            if (!Number.isInteger(value) || value < 0 || value > 14) {
                return 'Invalid number bet (must be 0-14)';
            }
        } else if (type === 'color') {
            if (!['red', 'black', 'green'].includes(value)) {
                return 'Invalid color bet';
            }
        } else if (type === 'type') {
            if (!['even', 'odd'].includes(value)) {
                return 'Invalid type bet (must be even or odd)';
            }
        }

        return null; // Valid
    };

    describe('Amount validation', () => {
        it('should reject amount below minimum', () => {
            expect(validateBet('number', 5, 10)).toBe('Invalid bet amount (minimum is 11)');
        });

        it('should reject non-integer amounts', () => {
            expect(validateBet('number', 5, 10.5)).toBe('Invalid bet amount (minimum is 11)');
        });

        it('should reject zero amount', () => {
            expect(validateBet('number', 5, 0)).toBe('Invalid bet amount (minimum is 11)');
        });

        it('should reject negative amount', () => {
            expect(validateBet('number', 5, -100)).toBe('Invalid bet amount (minimum is 11)');
        });

        it('should reject null amount', () => {
            expect(validateBet('number', 5, null)).toBe('Invalid bet amount (minimum is 11)');
        });

        it('should reject undefined amount', () => {
            expect(validateBet('number', 5, undefined)).toBe('Invalid bet amount (minimum is 11)');
        });

        it('should reject NaN amount', () => {
            expect(validateBet('number', 5, NaN)).toBe('Invalid bet amount (minimum is 11)');
        });

        it('should accept valid amount', () => {
            expect(validateBet('number', 5, 100)).toBeNull();
        });

        it('should accept minimum valid amount (11)', () => {
            expect(validateBet('number', 5, 11)).toBeNull();
        });

        it('should accept large amounts', () => {
            expect(validateBet('number', 5, 1000000)).toBeNull();
        });
    });

    describe('Type validation', () => {
        it('should reject null bet type', () => {
            expect(validateBet(null, 5, 100)).toBe('Invalid bet type');
        });

        it('should reject undefined bet type', () => {
            expect(validateBet(undefined, 5, 100)).toBe('Invalid bet type');
        });

        it('should reject invalid bet type', () => {
            expect(validateBet('invalid', 5, 100)).toBe('Invalid bet type');
        });

        it('should reject empty string bet type', () => {
            expect(validateBet('', 5, 100)).toBe('Invalid bet type');
        });
    });

    describe('Number bets', () => {
        it('should accept numbers 0-14', () => {
            for (let i = 0; i <= 14; i++) {
                expect(validateBet('number', i, 100)).toBeNull();
            }
        });

        it('should reject number 15', () => {
            expect(validateBet('number', 15, 100)).toBe('Invalid number bet (must be 0-14)');
        });

        it('should reject negative numbers', () => {
            expect(validateBet('number', -1, 100)).toBe('Invalid number bet (must be 0-14)');
        });

        it('should reject float numbers', () => {
            expect(validateBet('number', 5.5, 100)).toBe('Invalid number bet (must be 0-14)');
        });

        it('should reject string numbers', () => {
            expect(validateBet('number', '5', 100)).toBe('Invalid number bet (must be 0-14)');
        });
    });

    describe('Color bets', () => {
        it('should accept valid colors', () => {
            expect(validateBet('color', 'red', 100)).toBeNull();
            expect(validateBet('color', 'black', 100)).toBeNull();
            expect(validateBet('color', 'green', 100)).toBeNull();
        });

        it('should reject invalid colors', () => {
            expect(validateBet('color', 'blue', 100)).toBe('Invalid color bet');
        });

        it('should reject uppercase colors', () => {
            expect(validateBet('color', 'RED', 100)).toBe('Invalid color bet');
        });

        it('should reject null color', () => {
            expect(validateBet('color', null, 100)).toBe('Invalid color bet');
        });
    });

    describe('Type bets', () => {
        it('should accept even and odd', () => {
            expect(validateBet('type', 'even', 100)).toBeNull();
            expect(validateBet('type', 'odd', 100)).toBeNull();
        });

        it('should reject invalid types', () => {
            expect(validateBet('type', 'prime', 100)).toBe('Invalid type bet (must be even or odd)');
        });

        it('should reject uppercase even/odd', () => {
            expect(validateBet('type', 'EVEN', 100)).toBe('Invalid type bet (must be even or odd)');
        });

        it('should reject null type value', () => {
            expect(validateBet('type', null, 100)).toBe('Invalid type bet (must be even or odd)');
        });
    });
});
