import type { NextFunction, Request, Response } from 'express';

import bcrypt from 'bcryptjs';
import express from 'express';
import request from 'supertest';

import Bet = require('../models/Bet');
import Transaction = require('../models/Transaction');
import User = require('../models/User');
import './setup';

type AuthMiddleware = (req: Request, res: Response, next: NextFunction) => void;
type CreatedUser = {
  _id: { toString(): string };
};

jest.mock('../middleware/auth', () =>
  jest.fn((req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: 'default-id', role: 'user' };
    next();
  })
);

const auth = require('../middleware/auth') as jest.MockedFunction<AuthMiddleware>;
const gameRouter = require('../routes/game');

const app = express();
app.use(express.json());
app.use('/api/game', gameRouter);

describe('GET /api/game/history Filters', () => {
  let user: CreatedUser;

  beforeEach(async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123', salt);

    user = (await User.create({
      username: 'testuser',
      password: hashedPassword,
      role: 'user',
      balance: 1000,
    })) as CreatedUser;

    auth.mockImplementation((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: user._id.toString(), role: 'user' };
      next();
    });
  });

  it('should filter by exact roundId match', async () => {
    await Bet.create({
      user: user._id,
      username: 'testuser',
      type: 'number',
      value: 5,
      amount: 100,
      roundId: 'some-long-uuid-matching-1234',
      status: 'completed',
      createdAt: new Date(),
    });

    await Bet.create({
      user: user._id,
      username: 'testuser',
      type: 'number',
      value: 5,
      amount: 100,
      roundId: 'other-round-5678',
      status: 'completed',
      createdAt: new Date(),
    });

    const res = await request(app).get('/api/game/history').query({
      roundId: 'some-long-uuid-matching-1234',
      page: 1,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].roundId).toBe('some-long-uuid-matching-1234');
  });

  it('should reject invalid roundId filters', async () => {
    const res = await request(app).get('/api/game/history').query({ roundId: 'round.*', page: 1 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid roundId format' });
  });

  it('should filter by date', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await Bet.create({
      user: user._id,
      username: 'testuser',
      type: 'number',
      value: 5,
      amount: 100,
      roundId: 'today-round',
      status: 'completed',
      createdAt: today,
    });

    await Bet.create({
      user: user._id,
      username: 'testuser',
      type: 'number',
      value: 5,
      amount: 100,
      roundId: 'yesterday-round',
      status: 'completed',
      createdAt: yesterday,
    });

    const dateStr = today.toISOString().split('T')[0];

    const res = await request(app).get('/api/game/history').query({ date: dateStr, page: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].roundId).toBe('today-round');
  });

  it('should filter by explicit startDate and endDate range', async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 1_000_000);
    const future = new Date(now.getTime() + 1_000_000);

    await Bet.create({
      user: user._id,
      username: 'testuser',
      type: 'number',
      value: 5,
      amount: 100,
      roundId: 'range-match',
      status: 'completed',
      createdAt: now,
    });

    await Bet.create({
      user: user._id,
      username: 'testuser',
      type: 'number',
      value: 5,
      amount: 100,
      roundId: 'range-miss',
      status: 'completed',
      createdAt: future,
    });

    const rangeEnd = new Date(now.getTime() + 500);

    const res = await request(app).get('/api/game/history').query({
      startDate: past.toISOString(),
      endDate: rangeEnd.toISOString(),
      page: 1,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].roundId).toBe('range-match');
  });

  it('should reject invalid date filters', async () => {
    const invalidSingleDate = await request(app).get('/api/game/history').query({ date: 'not-a-date', page: 1 });
    expect(invalidSingleDate.status).toBe(400);
    expect(invalidSingleDate.body).toEqual({ message: 'Invalid date' });

    const invalidDateRange = await request(app).get('/api/game/history').query({
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: 'bad-date',
      page: 1,
    });
    expect(invalidDateRange.status).toBe(400);
    expect(invalidDateRange.body).toEqual({ message: 'Invalid startDate or endDate' });

    const incompleteDateRange = await request(app).get('/api/game/history').query({
      startDate: '2025-01-01T00:00:00.000Z',
      page: 1,
    });
    expect(incompleteDateRange.status).toBe(400);
    expect(incompleteDateRange.body).toEqual({
      message: 'startDate and endDate must be provided together',
    });
  });

  it('should filter correctly using strict ISO boundaries', async () => {
    const dec12_20h = new Date('2025-12-12T20:00:00.000Z');

    await Bet.create({
      user: user._id,
      username: 'utc-test',
      type: 'number',
      value: 5,
      amount: 100,
      roundId: 'utc-test-bet',
      status: 'completed',
      createdAt: dec12_20h,
    });

    const dec13Start = new Date('2025-12-13T00:00:00.000Z').toISOString();
    const dec13End = new Date('2025-12-14T00:00:00.000Z').toISOString();

    const res1 = await request(app).get('/api/game/history').query({
      startDate: dec13Start,
      endDate: dec13End,
      page: 1,
    });
    expect(res1.body.data.find((bet: { roundId: string }) => bet.roundId === 'utc-test-bet')).toBeUndefined();

    const dec12Start = new Date('2025-12-12T00:00:00.000Z').toISOString();
    const dec12End = new Date('2025-12-13T00:00:00.000Z').toISOString();

    const res2 = await request(app).get('/api/game/history').query({
      startDate: dec12Start,
      endDate: dec12End,
      page: 1,
    });
    expect(res2.body.data.find((bet: { roundId: string }) => bet.roundId === 'utc-test-bet')).toBeDefined();
  });

  it('should return results in { data: [...] } format when page is specified', async () => {
    await Bet.create({
      user: user._id,
      username: 'testuser',
      type: 'number',
      value: 1,
      amount: 10,
      roundId: 'paged-round',
      status: 'completed',
      createdAt: new Date(),
    });

    const res = await request(app).get('/api/game/history').query({ page: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].roundId).toBe('paged-round');
  });

  it('should return results as an array directly when page is not specified', async () => {
    await Bet.create({
      user: user._id,
      username: 'testuser',
      type: 'number',
      value: 2,
      amount: 20,
      roundId: 'unpaged-round',
      status: 'completed',
      createdAt: new Date(),
    });

    const res = await request(app).get('/api/game/history');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].roundId).toBe('unpaged-round');
  });
});
