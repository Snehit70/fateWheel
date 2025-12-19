const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../index');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect(); // Disconnect existing connection from index.js if any
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    server.close(); // Close the http server if it started
});

describe('Auth API', () => {
    let token;
    const testUser = {
        username: 'testauthuser',
        password: 'Password123!'
    };

    it('POST /api/auth/register - should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Registration successful. Please wait for admin approval.');
    });

    it('POST /api/auth/login - should fail for pending user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send(testUser);

        // Default status is 'pending', so login should fail with 403
        expect(res.statusCode).toEqual(403);
        expect(res.body).toHaveProperty('message', 'Account pending approval');
    });

    it('POST /api/auth/login - should login approved user', async () => {
        // Manually approve user
        const User = require('../models/User');
        await User.findOneAndUpdate({ username: testUser.username }, { status: 'approved' });

        const res = await request(app)
            .post('/api/auth/login')
            .send(testUser);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        token = res.body.token;
    });

    it('GET /api/auth/me - should get user details', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('x-auth-token', token);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('username', testUser.username);
    });

    it('GET /api/auth/me - should fail without token', async () => {
        const res = await request(app)
            .get('/api/auth/me');

        expect(res.statusCode).toEqual(401);
    });
});
