const User = require('../models/User');
const Bet = require('../models/Bet');
const Transaction = require('../models/Transaction');

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
});
