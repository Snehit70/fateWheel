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

    it('should filter by roundId (partial match)', async () => {
        // Create matching bet with long ID
        await Bet.create({
            user: user._id,
            username: 'testuser',
            type: 'number',
            value: 5,
            amount: 100,
            roundId: 'some-long-uuid-matching-1234',
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
            roundId: 'other-round-5678',
            status: 'completed',
            createdAt: new Date()
        });

        const res = await request(app).get('/api/game/history').query({ roundId: '1234', page: 1 });

        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
        // Should only find the matching bet
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].roundId).toBe('some-long-uuid-matching-1234');
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

    it('should filter by explicit startDate and endDate range', async () => {
        const now = new Date();
        // Ensure strictly separate times
        const past = new Date(now.getTime() - 1000000);
        const future = new Date(now.getTime() + 1000000);

        // Create bet "now" (in range)
        await Bet.create({
            user: user._id,
            username: 'testuser',
            type: 'number',
            value: 5,
            amount: 100,
            roundId: 'range-match',
            status: 'completed',
            createdAt: now
        });

        // Create bet "future" (out of range)
        await Bet.create({
            user: user._id,
            username: 'testuser',
            type: 'number',
            value: 5,
            amount: 100,
            roundId: 'range-miss',
            status: 'completed',
            createdAt: future
        });

        // Define range covering "now" but not "future"
        // Start: past, End: now + 500ms
        const rangeEnd = new Date(now.getTime() + 500);

        const res = await request(app).get('/api/game/history').query({
            startDate: past.toISOString(),
            endDate: rangeEnd.toISOString(),
            page: 1
        });

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].roundId).toBe('range-match');
    });

    it('should filter correctly using strict ISO boundaries', async () => {
        // Create bet on Dec 12, 20:00 UTC
        const dec12_20h = new Date('2025-12-12T20:00:00.000Z');

        await Bet.create({
            user: user._id,
            username: 'utc-test',
            type: 'number',
            value: 5,
            amount: 100,
            roundId: 'utc-test-bet',
            status: 'completed',
            createdAt: dec12_20h
        });

        // Filter for Dec 13 UTC strict range
        const dec13_start = new Date('2025-12-13T00:00:00.000Z').toISOString();
        const dec13_end = new Date('2025-12-14T00:00:00.000Z').toISOString();

        const res1 = await request(app).get('/api/game/history').query({
            startDate: dec13_start,
            endDate: dec13_end,
            page: 1
        });
        expect(res1.body.data.find(b => b.roundId === 'utc-test-bet')).toBeUndefined();

        // Filter for Dec 12 UTC strict range
        const dec12_start = new Date('2025-12-12T00:00:00.000Z').toISOString();
        const dec12_end = new Date('2025-12-13T00:00:00.000Z').toISOString();

        const res2 = await request(app).get('/api/game/history').query({
            startDate: dec12_start,
            endDate: dec12_end,
            page: 1
        });
        expect(res2.body.data.find(b => b.roundId === 'utc-test-bet')).toBeDefined();
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
