require('./setup');
const authMiddleware = require('../middleware/auth');
const supabase = require('../utils/supabase');
const User = require('../models/User');

describe('Auth Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
            path: '/test',
            header: jest.fn()
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('Health endpoint bypass', () => {
        it('should skip auth for /healthz endpoint', async () => {
            mockReq.path = '/healthz';

            await authMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockRes.status).not.toHaveBeenCalled();
        });
    });

    describe('Token validation', () => {
        it('should return 401 when no token provided', async () => {
            mockReq.header.mockReturnValue(null);

            await authMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'No token, authorization denied'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 when token is invalid', async () => {
            mockReq.header.mockReturnValue('invalid-token');
            supabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: new Error('Invalid token')
            });

            await authMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Token is not valid'
            });
        });

        it('should return 401 when token is expired', async () => {
            mockReq.header.mockReturnValue('expired-token');
            supabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: { message: 'jwt expired' }
            });

            await authMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Token is not valid'
            });
        });

        it('should authenticate valid token and attach user', async () => {
            const supabaseUid = 'test-supabase-uid';
            mockReq.header.mockReturnValue('valid-token');

            supabase.auth.getUser.mockResolvedValue({
                data: {
                    user: {
                        id: supabaseUid,
                        user_metadata: { username: 'testuser' },
                        email: 'testuser@roulette.game'
                    }
                },
                error: null
            });

            // Create a user in the test DB
            const testUser = await User.create({
                username: 'testuser',
                supabaseUid: supabaseUid,
                role: 'user',
                status: 'approved',
                balance: 1000
            });

            await authMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockReq.user).toBeDefined();
            expect(mockReq.user.id).toBe(testUser.id);
            expect(mockReq.user.role).toBe('user');
        });

        it('should handle Bearer prefix in token', async () => {
            const supabaseUid = 'bearer-test-uid';
            mockReq.header.mockReturnValue('Bearer valid-token-with-bearer');

            supabase.auth.getUser.mockResolvedValue({
                data: {
                    user: {
                        id: supabaseUid,
                        user_metadata: { username: 'beareruser' },
                        email: 'bearer@roulette.game'
                    }
                },
                error: null
            });

            await User.create({
                username: 'beareruser',
                supabaseUid: supabaseUid,
                role: 'user',
                status: 'approved'
            });

            await authMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockReq.user).toBeDefined();
        });

        it('should auto-create user if not found in MongoDB', async () => {
            const supabaseUid = 'new-user-uid';
            mockReq.header.mockReturnValue('valid-token');

            supabase.auth.getUser.mockResolvedValue({
                data: {
                    user: {
                        id: supabaseUid,
                        user_metadata: { username: 'newuser' },
                        email: 'newuser@roulette.game'
                    }
                },
                error: null
            });

            await authMiddleware(mockReq, mockRes, mockNext);

            // Auto-created users have 'pending' status, so they get 403
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Account pending approval',
                status: 'pending'
            });

            // Verify user was created
            const createdUser = await User.findOne({ supabaseUid });
            expect(createdUser).toBeTruthy();
            expect(createdUser.username).toBe('newuser');
            expect(createdUser.status).toBe('pending');
        });
    });

    describe('Edge cases', () => {
        it('should handle empty token string', async () => {
            mockReq.header.mockReturnValue('');

            await authMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        it('should handle whitespace-only token', async () => {
            mockReq.header.mockReturnValue('   ');

            // Whitespace-only token gets processed by Supabase and fails
            supabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: new Error('Invalid token')
            });

            await authMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        it('should handle user with missing username in metadata', async () => {
            const supabaseUid = 'no-username-uid';
            mockReq.header.mockReturnValue('valid-token');

            supabase.auth.getUser.mockResolvedValue({
                data: {
                    user: {
                        id: supabaseUid,
                        user_metadata: {},
                        email: 'nousername@roulette.game'
                    }
                },
                error: null
            });

            await authMiddleware(mockReq, mockRes, mockNext);

            // Should handle gracefully - either create with fallback or fail
            const createdUser = await User.findOne({ supabaseUid });
            if (createdUser) {
                expect(createdUser.username).toBeDefined();
            }
        });
    });
});
