require('./setup');
const mongoose = require('mongoose');
const User = require('../models/User');
const Bet = require('../models/Bet');
const Transaction = require('../models/Transaction');
const GameResult = require('../models/GameResult');
const AdminLog = require('../models/AdminLog');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
    describe('Schema validation', () => {
        it('should create user with valid fields', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Password123', salt);

            const user = await User.create({
                username: 'testuser',
                password: hashedPassword,
                role: 'user',
                balance: 1000
            });

            expect(user.username).toBe('testuser');
            expect(user.balance).toBe(1000);
            expect(user.role).toBe('user');
        });

        it('should default balance to 0', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Password123', salt);

            const user = await User.create({
                username: 'newuser',
                password: hashedPassword,
                role: 'user'
            });

            expect(user.balance).toBe(0);
        });

        it('should default role to user', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Password123', salt);

            const user = await User.create({
                username: 'defaultrole',
                password: hashedPassword
            });

            expect(user.role).toBe('user');
        });
    });

    describe('Unique constraints', () => {
        it('should reject duplicate username', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Password123', salt);

            await User.create({
                username: 'uniqueuser',
                password: hashedPassword
            });

            await expect(User.create({
                username: 'uniqueuser',
                password: hashedPassword
            })).rejects.toThrow();
        });
    });

    describe('Balance operations', () => {
        it('should support atomic balance increment', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Password123', salt);

            const user = await User.create({
                username: 'balancetest',
                password: hashedPassword,
                balance: 500
            });

            const updated = await User.findByIdAndUpdate(
                user.id,
                { $inc: { balance: 100 } },
                { new: true }
            );

            expect(updated.balance).toBe(600);
        });

        it('should support atomic balance decrement', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Password123', salt);

            const user = await User.create({
                username: 'decrementtest',
                password: hashedPassword,
                balance: 500
            });

            const updated = await User.findByIdAndUpdate(
                user.id,
                { $inc: { balance: -100 } },
                { new: true }
            );

            expect(updated.balance).toBe(400);
        });

        it('should support conditional update for betting', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Password123', salt);

            const user = await User.create({
                username: 'conditionaltest',
                password: hashedPassword,
                balance: 100
            });

            // Try to deduct more than balance (should fail)
            const result = await User.findOneAndUpdate(
                { _id: user.id, balance: { $gte: 200 } },
                { $inc: { balance: -200 } },
                { new: true }
            );

            expect(result).toBeNull();

            // Try to deduct within balance (should succeed)
            const success = await User.findOneAndUpdate(
                { _id: user.id, balance: { $gte: 50 } },
                { $inc: { balance: -50 } },
                { new: true }
            );

            expect(success.balance).toBe(50);
        });
    });
});

describe('Bet Model', () => {
    let testUser;

    beforeEach(async () => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Password123', salt);

        testUser = await User.create({
            username: 'betuser',
            password: hashedPassword,
            balance: 1000
        });
    });

    describe('Bet creation', () => {
        it('should create number bet', async () => {
            const bet = await Bet.create({
                user: testUser.id,
                username: testUser.username,
                type: 'number',
                value: 7,
                amount: 100,
                roundId: 'round-123'
            });

            expect(bet.type).toBe('number');
            expect(bet.value).toBe(7);
            expect(bet.status).toBe('active');
        });

        it('should create color bet', async () => {
            const bet = await Bet.create({
                user: testUser.id,
                username: testUser.username,
                type: 'color',
                value: 'red',
                amount: 50,
                roundId: 'round-123'
            });

            expect(bet.type).toBe('color');
            expect(bet.value).toBe('red');
        });

        it('should create type bet (even/odd)', async () => {
            const bet = await Bet.create({
                user: testUser.id,
                username: testUser.username,
                type: 'type',
                value: 'even',
                amount: 100,
                roundId: 'round-123'
            });

            expect(bet.type).toBe('type');
            expect(bet.value).toBe('even');
        });
    });

    describe('Bet status transitions', () => {
        it('should transition from active to completed', async () => {
            const bet = await Bet.create({
                user: testUser.id,
                username: testUser.username,
                type: 'number',
                value: 5,
                amount: 100,
                roundId: 'round-456'
            });

            bet.status = 'completed';
            bet.result = 'win';
            bet.payout = 1400;
            await bet.save();

            expect(bet.status).toBe('completed');
            expect(bet.result).toBe('win');
        });

        it('should transition to refunded on server restart', async () => {
            const bet = await Bet.create({
                user: testUser.id,
                username: testUser.username,
                type: 'color',
                value: 'black',
                amount: 100,
                roundId: 'round-789'
            });

            bet.status = 'refunded';
            await bet.save();

            expect(bet.status).toBe('refunded');
        });
    });

    describe('Bet queries', () => {
        it('should find active bets by roundId', async () => {
            const roundId = 'query-round-123';

            await Bet.create({
                user: testUser.id,
                username: testUser.username,
                type: 'number',
                value: 1,
                amount: 50,
                roundId,
                status: 'active'
            });

            await Bet.create({
                user: testUser.id,
                username: testUser.username,
                type: 'color',
                value: 'red',
                amount: 100,
                roundId,
                status: 'active'
            });

            const activeBets = await Bet.find({ roundId, status: 'active' });
            expect(activeBets).toHaveLength(2);
        });

        it('should find bets by user', async () => {
            await Bet.create({
                user: testUser.id,
                username: testUser.username,
                type: 'number',
                value: 3,
                amount: 100,
                roundId: 'user-round'
            });

            const userBets = await Bet.find({ user: testUser.id });
            expect(userBets.length).toBeGreaterThanOrEqual(1);
        });

        it('should populate user reference', async () => {
            const bet = await Bet.create({
                user: testUser.id,
                username: testUser.username,
                type: 'number',
                value: 7,
                amount: 100,
                roundId: 'populate-round'
            });

            const populatedBet = await Bet.findById(bet.id).populate('user');
            expect(populatedBet.user.username).toBe('betuser');
        });
    });
});

describe('Transaction Model', () => {
    let testUser;

    beforeEach(async () => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Password123', salt);

        testUser = await User.create({
            username: 'txuser',
            password: hashedPassword,
            balance: 500
        });
    });

    it('should create adjustment transaction', async () => {
        const tx = await Transaction.create({
            user: testUser.id,
            type: 'adjustment',
            amount: 100,
            balanceAfter: 600,
            description: 'Admin credit'
        });

        expect(tx.type).toBe('adjustment');
        expect(tx.amount).toBe(100);
    });

    it('should reject negative adjustments (model enforces min: 0)', async () => {
        await expect(Transaction.create({
            user: testUser.id,
            type: 'adjustment',
            amount: -200,
            balanceAfter: 300,
            description: 'Admin deduction'
        })).rejects.toThrow();
    });

    it('should have createdAt timestamp', async () => {
        const tx = await Transaction.create({
            user: testUser.id,
            type: 'adjustment',
            amount: 100,
            balanceAfter: 600,
            description: 'Test'
        });

        expect(tx.createdAt).toBeDefined();
        expect(tx.createdAt instanceof Date).toBe(true);
    });
});

describe('GameResult Model', () => {
    it('should create game result with valid fields', async () => {
        const result = await GameResult.create({
            roundId: 'game-round-001',
            roundNumber: 1,
            number: 7,
            color: 'red'
        });

        expect(result.roundId).toBe('game-round-001');
        expect(result.number).toBe(7);
        expect(result.color).toBe('red');
    });

    it('should enforce unique roundId', async () => {
        await GameResult.create({
            roundId: 'unique-round',
            roundNumber: 1,
            number: 5,
            color: 'black'
        });

        await expect(GameResult.create({
            roundId: 'unique-round',
            roundNumber: 2,
            number: 3,
            color: 'red'
        })).rejects.toThrow();
    });

    it('should validate number range (0-14)', async () => {
        await expect(GameResult.create({
            roundId: 'invalid-number-round',
            roundNumber: 1,
            number: 15,
            color: 'red'
        })).rejects.toThrow();

        await expect(GameResult.create({
            roundId: 'negative-number-round',
            roundNumber: 1,
            number: -1,
            color: 'red'
        })).rejects.toThrow();
    });

    it('should validate color enum', async () => {
        await expect(GameResult.create({
            roundId: 'invalid-color-round',
            roundNumber: 1,
            number: 5,
            color: 'blue'
        })).rejects.toThrow();
    });
});

describe('AdminLog Model', () => {
    let adminUser, targetUser;

    beforeEach(async () => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Password123', salt);

        adminUser = await User.create({
            username: 'adminlogtest',
            password: hashedPassword,
            role: 'admin'
        });

        targetUser = await User.create({
            username: 'targetuser',
            password: hashedPassword
        });
    });

    it('should create delete_user log', async () => {
        const log = await AdminLog.create({
            adminId: adminUser.id,
            action: 'delete_user',
            targetUserId: targetUser.id,
            targetUsername: targetUser.username
        });

        expect(log.action).toBe('delete_user');
    });

    it('should create update_balance log', async () => {
        const log = await AdminLog.create({
            adminId: adminUser.id,
            action: 'update_balance',
            targetUserId: targetUser.id,
            targetUsername: targetUser.username,
            details: 'Changed balance from 0 to 1000'
        });

        expect(log.action).toBe('update_balance');
        expect(log.details).toContain('1000');
    });

    it('should validate action enum', async () => {
        await expect(AdminLog.create({
            adminId: adminUser.id,
            action: 'invalid_action',
            targetUserId: targetUser.id,
            targetUsername: targetUser.username
        })).rejects.toThrow();
    });

    it.each(['approve_user', 'reject_user', 'toggle_reset'])(
        'should reject removed action %s',
        async (action) => {
            await expect(AdminLog.create({
                adminId: adminUser.id,
                action,
                targetUserId: targetUser.id,
                targetUsername: targetUser.username
            })).rejects.toThrow();
        }
    );
});
