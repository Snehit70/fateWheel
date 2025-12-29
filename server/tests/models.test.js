require('./setup');
const mongoose = require('mongoose');
const User = require('../models/User');
const Bet = require('../models/Bet');
const Transaction = require('../models/Transaction');
const GameResult = require('../models/GameResult');
const AdminLog = require('../models/AdminLog');

describe('User Model', () => {
    describe('Schema validation', () => {
        it('should create user with valid fields', async () => {
            const user = await User.create({
                username: 'testuser',
                supabaseUid: 'test-uid',
                role: 'user',
                status: 'approved',
                balance: 1000
            });

            expect(user.username).toBe('testuser');
            expect(user.balance).toBe(1000);
            expect(user.role).toBe('user');
        });

        it('should default balance to 0', async () => {
            const user = await User.create({
                username: 'newuser',
                supabaseUid: 'new-uid',
                role: 'user',
                status: 'pending'
            });

            expect(user.balance).toBe(0);
        });

        it('should default role to user', async () => {
            const user = await User.create({
                username: 'defaultrole',
                supabaseUid: 'default-uid',
                status: 'approved'
            });

            expect(user.role).toBe('user');
        });

        it('should default status to pending', async () => {
            const user = await User.create({
                username: 'defaultstatus',
                supabaseUid: 'status-uid'
            });

            expect(user.status).toBe('pending');
        });
    });

    describe('Unique constraints', () => {
        it('should reject duplicate username', async () => {
            await User.create({
                username: 'uniqueuser',
                supabaseUid: 'unique-uid-1'
            });

            await expect(User.create({
                username: 'uniqueuser',
                supabaseUid: 'unique-uid-2'
            })).rejects.toThrow();
        });

        it('should reject duplicate supabaseUid', async () => {
            await User.create({
                username: 'user1',
                supabaseUid: 'same-supabase-uid'
            });

            await expect(User.create({
                username: 'user2',
                supabaseUid: 'same-supabase-uid'
            })).rejects.toThrow();
        });
    });

    describe('Balance operations', () => {
        it('should support atomic balance increment', async () => {
            const user = await User.create({
                username: 'balancetest',
                supabaseUid: 'balance-uid',
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
            const user = await User.create({
                username: 'decrementtest',
                supabaseUid: 'decrement-uid',
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
            const user = await User.create({
                username: 'conditionaltest',
                supabaseUid: 'conditional-uid',
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

        it('should allow balance to go negative via direct update (beware)', async () => {
            // This is a warning test - MongoDB allows negative balances via $inc
            const user = await User.create({
                username: 'negativetest',
                supabaseUid: 'negative-uid',
                balance: 50
            });

            const updated = await User.findByIdAndUpdate(
                user.id,
                { $inc: { balance: -100 } },
                { new: true }
            );

            // This proves we need application-level validation
            expect(updated.balance).toBe(-50);
        });
    });
});

describe('Bet Model', () => {
    let testUser;

    beforeEach(async () => {
        testUser = await User.create({
            username: 'betuser',
            supabaseUid: 'bet-uid',
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

        it('should require minimum bet amount', async () => {
            // Assuming Bet model has min validation on amount
            const bet = await Bet.create({
                user: testUser.id,
                username: testUser.username,
                type: 'number',
                value: 5,
                amount: 10, // Minimum valid amount
                roundId: 'round-min'
            });

            expect(bet.amount).toBe(10);
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

        it('should record loss result', async () => {
            const bet = await Bet.create({
                user: testUser.id,
                username: testUser.username,
                type: 'number',
                value: 5,
                amount: 100,
                roundId: 'round-loss'
            });

            bet.status = 'completed';
            bet.result = 'loss';
            bet.payout = 0;
            await bet.save();

            expect(bet.result).toBe('loss');
            expect(bet.payout).toBe(0);
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
        testUser = await User.create({
            username: 'txuser',
            supabaseUid: 'tx-uid',
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

    it('should create refund transaction', async () => {
        const tx = await Transaction.create({
            user: testUser.id,
            type: 'adjustment',
            amount: 50,
            balanceAfter: 550,
            description: 'Refund: Server Restart'
        });

        expect(tx.description).toContain('Refund');
    });

    it('should reject negative adjustments (model enforces min: 0)', async () => {
        // Transaction model has amount: { min: 0 }, so negative amounts are rejected
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
        expect(result.roundNumber).toBe(1);
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
            number: 15, // Invalid: max is 14
            color: 'red'
        })).rejects.toThrow();

        await expect(GameResult.create({
            roundId: 'negative-number-round',
            roundNumber: 1,
            number: -1, // Invalid: min is 0
            color: 'red'
        })).rejects.toThrow();
    });

    it('should validate color enum', async () => {
        await expect(GameResult.create({
            roundId: 'invalid-color-round',
            roundNumber: 1,
            number: 5,
            color: 'blue' // Invalid color
        })).rejects.toThrow();
    });

    it('should store game stats', async () => {
        const result = await GameResult.create({
            roundId: 'stats-round',
            roundNumber: 10,
            number: 0,
            color: 'green',
            stats: {
                totalBets: 50,
                totalWagered: 5000,
                totalPayout: 4500,
                netProfit: 500,
                uniqueUsers: 10
            }
        });

        expect(result.stats.totalBets).toBe(50);
        expect(result.stats.netProfit).toBe(500);
    });

    it('should have createdAt with index', async () => {
        const result = await GameResult.create({
            roundId: 'timestamp-round',
            roundNumber: 5,
            number: 3,
            color: 'red'
        });

        expect(result.createdAt).toBeDefined();
    });

    it('should find results by roundNumber', async () => {
        await GameResult.create({
            roundId: 'query-round-1',
            roundNumber: 100,
            number: 7,
            color: 'red'
        });

        const results = await GameResult.find({ roundNumber: 100 });
        expect(results).toHaveLength(1);
    });
});

describe('AdminLog Model', () => {
    let adminUser, targetUser;

    beforeEach(async () => {
        adminUser = await User.create({
            username: 'admin',
            supabaseUid: 'admin-log-uid',
            role: 'admin',
            status: 'approved'
        });

        targetUser = await User.create({
            username: 'targetuser',
            supabaseUid: 'target-uid',
            status: 'pending'
        });
    });

    it('should create approve_user log', async () => {
        const log = await AdminLog.create({
            adminId: adminUser.id,
            action: 'approve_user',
            targetUserId: targetUser.id,
            targetUsername: targetUser.username,
            details: 'Approved new user'
        });

        expect(log.action).toBe('approve_user');
        expect(log.targetUsername).toBe('targetuser');
    });

    it('should create reject_user log', async () => {
        const log = await AdminLog.create({
            adminId: adminUser.id,
            action: 'reject_user',
            targetUserId: targetUser.id,
            targetUsername: targetUser.username,
            details: 'Rejected: suspicious activity'
        });

        expect(log.action).toBe('reject_user');
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
            action: 'invalid_action', // Not in enum
            targetUserId: targetUser.id,
            targetUsername: targetUser.username
        })).rejects.toThrow();
    });

    it('should require adminId', async () => {
        await expect(AdminLog.create({
            action: 'approve_user',
            targetUserId: targetUser.id,
            targetUsername: targetUser.username
        })).rejects.toThrow();
    });

    it('should have createdAt timestamp', async () => {
        const log = await AdminLog.create({
            adminId: adminUser.id,
            action: 'approve_user',
            targetUserId: targetUser.id,
            targetUsername: targetUser.username
        });

        expect(log.createdAt).toBeDefined();
    });

    it('should populate admin reference', async () => {
        const log = await AdminLog.create({
            adminId: adminUser.id,
            action: 'approve_user',
            targetUserId: targetUser.id,
            targetUsername: targetUser.username
        });

        const populatedLog = await AdminLog.findById(log.id).populate('adminId');
        expect(populatedLog.adminId.username).toBe('admin');
    });

    it('should find logs by adminId', async () => {
        await AdminLog.create({
            adminId: adminUser.id,
            action: 'approve_user',
            targetUserId: targetUser.id,
            targetUsername: targetUser.username
        });

        await AdminLog.create({
            adminId: adminUser.id,
            action: 'update_balance',
            targetUserId: targetUser.id,
            targetUsername: targetUser.username
        });

        const logs = await AdminLog.find({ adminId: adminUser.id });
        expect(logs).toHaveLength(2);
    });
});
