const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../index');
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
    server.close();
});

describe('Admin Password Reset Toggle Fix', () => {
    let adminToken;
    let brokenUserId;

    beforeEach(async () => {
        // Clear DB
        await User.deleteMany({});

        // Create Admin
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('AdminPassword123!', salt);

        const adminUser = new User({
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            status: 'approved'
        });
        await adminUser.save();

        // Login as Admin to get token
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'admin',
                password: 'AdminPassword123!'
            });

        adminToken = res.body.token;

        // Create a "Broken" User (Missing Password) directly in collection
        // modifying status to 'pending' so we can toggle reset (logic restriction)
        const brokenUser = {
            username: 'brokenuser',
            // No password field!
            role: 'user',
            status: 'pending',
            balance: 0,
            allowPasswordReset: false
        };

        const insertion = await User.collection.insertOne(brokenUser);
        brokenUserId = insertion.insertedId.toString();
    });

    it('PUT /api/admin/users/:id/allow-reset - should succeed even if user has no password', async () => {
        const res = await request(app)
            .put(`/api/admin/users/${brokenUserId}/allow-reset`)
            .set('x-auth-token', adminToken)
            .send({
                allowPasswordReset: true
            });

        // EXPECTATION: Should be 200 OK (Fix working), NOT 500 (Fix failed)
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('allowPasswordReset', true);

        // Verify in DB
        const userInDb = await User.findById(brokenUserId);
        expect(userInDb.allowPasswordReset).toBe(true);
        // Password should still be missing (undefined)
        expect(userInDb.password).toBeUndefined();
    });
});
