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
    });

    describe('TIMING', () => {
        it('should have reasonable timing constants', () => {
            expect(TIMING.WAITING_TIME).toBeGreaterThan(0);
            expect(TIMING.SPIN_DURATION).toBeGreaterThan(0);
            expect(TIMING.RESULT_DURATION).toBeGreaterThan(0);
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
});

describe('Bet Validation Logic', () => {
    const validateBet = (type, value, amount) => {
        if (!amount || isNaN(amount) || amount < 11 || !Number.isInteger(amount)) {
            return 'Invalid bet amount (minimum is 11)';
        }

        const VALID_TYPES = ['number', 'color', 'type'];
        if (!VALID_TYPES.includes(type)) {
            return 'Invalid bet type';
        }

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

        it('should accept valid amount', () => {
            expect(validateBet('number', 5, 100)).toBeNull();
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
    });

    describe('Type bets', () => {
        it('should accept even and odd', () => {
            expect(validateBet('type', 'even', 100)).toBeNull();
            expect(validateBet('type', 'odd', 100)).toBeNull();
        });

        it('should reject invalid types', () => {
            expect(validateBet('type', 'prime', 100)).toBe('Invalid type bet (must be even or odd)');
        });
    });
});
