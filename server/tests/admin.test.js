const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
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
        it('should allow admin user', async () => {
            mockReq.user = { id: 'user123', role: 'admin' };

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should deny non-admin user with 403', async () => {
            mockReq.user = { id: 'user123', role: 'user' };

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Access denied. Admin only.'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('Role from database (fallback path)', () => {
        it('should allow admin from DB when role not in token', async () => {
            const adminUser = await User.create({
                username: 'admin',
                supabaseUid: 'admin-uid',
                role: 'admin',
                status: 'approved'
            });
            mockReq.user = { id: adminUser.id };

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockReq.user.role).toBe('admin');
        });

        it('should deny user from DB when role is user', async () => {
            const regularUser = await User.create({
                username: 'regularuser',
                supabaseUid: 'user-uid',
                role: 'user',
                status: 'approved'
            });
            mockReq.user = { id: regularUser.id };

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('should return 404 when user not found', async () => {
            // Use mongoose.Types.ObjectId for proper ObjectId generation
            mockReq.user = { id: new mongoose.Types.ObjectId() };

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'User not found'
            });
        });
    });

    describe('Edge cases', () => {
        it('should handle missing req.user', async () => {
            mockReq.user = undefined;

            await adminMiddleware(mockReq, mockRes, mockNext);

            // Middleware returns 401 when auth hasn't run (no req.user)
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized. Authentication required.' });
        });

        it('should handle null req.user', async () => {
            mockReq.user = null;

            await adminMiddleware(mockReq, mockRes, mockNext);

            // Middleware returns 401 when auth hasn't run (no req.user)
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized. Authentication required.' });
        });

        it('should handle empty user object with no id or role', async () => {
            mockReq.user = {};

            await adminMiddleware(mockReq, mockRes, mockNext);

            // Empty object has no role, so DB lookup happens with undefined id
            // findById(undefined) returns null, triggering 404
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
        });
    });

    describe('Error handling', () => {
        it('should return 500 on database error', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            mockReq.user = { id: 'invalid-id' }; // This will cause a CastError

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            // Middleware uses .json() not .send()
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server Error' });

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
