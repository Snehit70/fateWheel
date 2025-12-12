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

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockReq.user).toBeDefined();

            // Verify user was created
            const createdUser = await User.findOne({ supabaseUid });
            expect(createdUser).toBeTruthy();
            expect(createdUser.username).toBe('newuser');
            expect(createdUser.status).toBe('approved');
        });
    });
});
