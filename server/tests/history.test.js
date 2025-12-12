const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const gameRouter = require('../routes/game');
// We need to mock auth middleware BEFORE importing router if possible, 
// but since router imports auth, we need to mock it in jest.mock
const User = require('../models/User');
const Bet = require('../models/Bet');
const Transaction = require('../models/Transaction');

// Mock auth middleware
jest.mock('../middleware/auth', () => jest.fn((req, res, next) => {
    // Default mock implementation
    req.user = { id: 'default-id' };
    next();
}));

const auth = require('../middleware/auth');

require('./setup');

const app = express();
app.use(express.json());
app.use('/api/game', gameRouter);

describe('GET /api/game/history Filters', () => {
    let user;

    beforeEach(async () => {
        // Create test user
        user = await User.create({
            username: 'testuser',
            supabaseUid: 'test-uid',
            role: 'user',
            status: 'approved',
            balance: 1000
        });

        // Update auth mock to use the real user ID
        auth.mockImplementation((req, res, next) => {
            req.user = { id: user._id.toString() };
            next();
        });
    });

    it('should filter by roundId', async () => {
        // Create matching bet
        await Bet.create({
            user: user._id,
            username: 'testuser',
            type: 'number',
            value: 5,
            amount: 100,
            roundId: 'target-round',
            status: 'completed',
            createdAt: new Date()
        });

        // Create non-matching bet
        await Bet.create({
            user: user._id,
            username: 'testuser',
            type: 'number',
            value: 5,
            amount: 100,
            roundId: 'other-round',
            status: 'completed',
            createdAt: new Date()
        });

        // Create transaction (should be excluded by roundId filter)
        await Transaction.create({
            user: user._id,
            type: 'deposit',
            amount: 500,
            balanceAfter: 1500,
            createdAt: new Date()
        });

        const res = await request(app).get('/api/game/history').query({ roundId: 'target-round', page: 1 });

        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
        // Should only find the matching bet
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].roundId).toBe('target-round');
    });

    it('should filter by date', async () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Bet from today
        await Bet.create({
            user: user._id,
            username: 'testuser',
            type: 'number',
            value: 5,
            amount: 100,
            roundId: 'today-round',
            status: 'completed',
            createdAt: today
        });

        // Bet from yesterday
        await Bet.create({
            user: user._id,
            username: 'testuser',
            type: 'number',
            value: 5,
            amount: 100,
            roundId: 'yesterday-round',
            status: 'completed',
            createdAt: yesterday
        });

        // Query for today (YYYY-MM-DD)
        const dateStr = today.toISOString().split('T')[0];

        const res = await request(app).get('/api/game/history').query({ date: dateStr, page: 1 });

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].roundId).toBe('today-round');
    });

    it('should return empty list when no matches found', async () => {
        const res = await request(app).get('/api/game/history').query({ roundId: 'non-existent', page: 1 });

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });

    it('should return results in { data: [...] } format when page is specified', async () => {
        // Create a bet
        await Bet.create({
            user: user._id,
            username: 'testuser',
            type: 'number',
            value: 1,
            amount: 10,
            roundId: 'paged-round',
            status: 'completed',
            createdAt: new Date()
        });

        const res = await request(app).get('/api/game/history').query({ page: 1 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].roundId).toBe('paged-round');
    });

    it('should return results as an array directly when page is not specified', async () => {
        // Create a bet
        await Bet.create({
            user: user._id,
            username: 'testuser',
            type: 'number',
            value: 2,
            amount: 20,
            roundId: 'unpaged-round',
            status: 'completed',
            createdAt: new Date()
        });

        const res = await request(app).get('/api/game/history'); // No page query param

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].roundId).toBe('unpaged-round');
    });
});
