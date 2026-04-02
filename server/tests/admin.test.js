const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const adminMiddleware = require('../middleware/admin');
const User = require('../models/User');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Admin Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = { user: {} };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('Role from token (optimistic path)', () => {
        it('should allow admin user from DB when role in token', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Password123', salt);

            const adminUser = await User.create({
                username: 'tokenadmin',
                password: hashedPassword,
                role: 'admin'
            });
            mockReq.user = { id: adminUser.id, role: 'admin' };

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should deny non-admin user with 403', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Password123', salt);

            const regularUser = await User.create({
                username: 'tokenregular',
                password: hashedPassword,
                role: 'user'
            });
            mockReq.user = { id: regularUser.id, role: 'user' };

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Access denied. Admin only.'
            });
        });
    });

    describe('Role from database (fallback path)', () => {
        it('should allow admin from DB when role not in token', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Password123', salt);

            const adminUser = await User.create({
                username: 'adminfallback',
                password: hashedPassword,
                role: 'admin'
            });
            mockReq.user = { id: adminUser.id };

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should deny user from DB when role is user', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Password123', salt);

            const regularUser = await User.create({
                username: 'regularfallback',
                password: hashedPassword,
                role: 'user'
            });
            mockReq.user = { id: regularUser.id };

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('should return 403 when user not found in DB', async () => {
            mockReq.user = { id: new mongoose.Types.ObjectId() };

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });

    describe('Error handling', () => {
        it('should return 500 when req.user is undefined', async () => {
            mockReq.user = undefined;

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });

        it('should return 500 when req.user is null', async () => {
            mockReq.user = null;

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });

        it('should return 500 on invalid user id', async () => {
            mockReq.user = { id: 'invalid-id' };

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });
});
