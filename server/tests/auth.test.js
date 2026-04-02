const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../index');

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
    await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
    });
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
        expect(res.body).toHaveProperty('message', 'Registration successful. You can now login.');
    });

    it('POST /api/auth/register - should fail for short password (7 chars)', async () => {
        const shortPassUser = {
            username: 'shortpass',
            password: '1234567'
        };
        const res = await request(app)
            .post('/api/auth/register')
            .send(shortPassUser);

        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('message', 'Password must be at least 8 characters long');
    });

    it('POST /api/auth/register - should succeed for 8 char password', async () => {
        const eightCharUser = {
            username: 'eightchar',
            password: '12345678'
        };
        const res = await request(app)
            .post('/api/auth/register')
            .send(eightCharUser);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Registration successful. You can now login.');
    });

    it('POST /api/auth/login - should login immediately after register', async () => {
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
        expect(res.body).toHaveProperty('role', 'user');
        expect(res.body).not.toHaveProperty('status');
    });

    it('GET /api/auth/me - should fail without token', async () => {
        const res = await request(app)
            .get('/api/auth/me');

        expect(res.statusCode).toEqual(401);
    });
});
