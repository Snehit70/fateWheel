import type { NextFunction, Request, Response } from 'express';

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import adminMiddleware = require('../middleware/admin');
import User = require('../models/User');
import './setup';

type MockResponse = Pick<Response, 'json' | 'send' | 'status'>;
type MockUser = { id?: string; role?: string };
type MockRequest = Omit<Partial<Request>, 'user'> & { user?: MockUser };
type CreatedUser = { id: string };

describe('Admin Middleware', () => {
  let mockReq: MockRequest;
  let mockRes: MockResponse;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = { user: { id: 'seed-user', role: 'user' } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Role from token (optimistic path)', () => {
    it('should allow admin user from DB when role in token', async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Password123', salt);

      const adminUser = (await User.create({
        username: 'tokenadmin',
        password: hashedPassword,
        role: 'admin',
      })) as CreatedUser;
      mockReq.user = { id: adminUser.id, role: 'admin' };

      await adminMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should deny non-admin user with 403', async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Password123', salt);

      const regularUser = (await User.create({
        username: 'tokenregular',
        password: hashedPassword,
        role: 'user',
      })) as CreatedUser;
      mockReq.user = { id: regularUser.id, role: 'user' };

      await adminMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Access denied. Admin only.',
      });
    });
  });

  describe('Role from database (fallback path)', () => {
    it('should allow admin from DB when role not in token', async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Password123', salt);

      const adminUser = (await User.create({
        username: 'adminfallback',
        password: hashedPassword,
        role: 'admin',
      })) as CreatedUser;
      mockReq.user = { id: adminUser.id };

      await adminMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should deny user from DB when role is user', async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Password123', salt);

      const regularUser = (await User.create({
        username: 'regularfallback',
        password: hashedPassword,
        role: 'user',
      })) as CreatedUser;
      mockReq.user = { id: regularUser.id };

      await adminMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 when user not found in DB', async () => {
      mockReq.user = { id: new mongoose.Types.ObjectId().toString(), role: 'user' };

      await adminMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Error handling', () => {
    it('should return 500 when req.user is undefined', async () => {
      mockReq.user = undefined;

      await adminMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should return 500 when req.user is null', async () => {
      mockReq.user = undefined;

      await adminMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should return 500 on invalid user id', async () => {
      mockReq.user = { id: 'invalid-id', role: 'user' };

      await adminMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
