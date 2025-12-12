const adminMiddleware = require('../middleware/admin');
const User = require('../models/User');

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
            mockReq.user = { id: '507f1f77bcf86cd799439011' }; // Valid ObjectId that doesn't exist

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'User not found'
            });
        });
    });

    describe('Error handling', () => {
        it('should return 500 on database error', async () => {
            mockReq.user = { id: 'invalid-id' }; // This will cause a CastError

            await adminMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.send).toHaveBeenCalledWith('Server Error');
        });
    });
});
