import request from 'supertest';

import { app, server } from '../index';
import './setup';

describe('Auth API', () => {
  let token: string;
  const testUser = {
    username: 'testauthuser',
    password: 'Password123!',
  };

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(err => {
        if (!err || err.message === 'Server is not running.') {
          resolve();
          return;
        }
        reject(err);
      });
    });
  });

  it('POST /api/auth/register - should register a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Registration successful. You can now login.');
  });

  it('POST /api/auth/register - should fail for short password (7 chars)', async () => {
    const shortPassUser = {
      username: 'shortpass',
      password: '1234567',
    };
    const res = await request(app).post('/api/auth/register').send(shortPassUser);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('message', 'Password must be at least 8 characters long');
  });

  it('POST /api/auth/register - should succeed for 8 char password', async () => {
    const eightCharUser = {
      username: 'eightchar',
      password: '12345678',
    };
    const res = await request(app).post('/api/auth/register').send(eightCharUser);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Registration successful. You can now login.');
  });

  it('POST /api/auth/login - should login immediately after register', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app).post('/api/auth/login').send(testUser);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('GET /api/auth/me - should get user details', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const loginRes = await request(app).post('/api/auth/login').send(testUser);
    token = loginRes.body.token;

    const res = await request(app).get('/api/auth/me').set('x-auth-token', token);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('username', testUser.username);
    expect(res.body).toHaveProperty('role', 'user');
    expect(res.body).not.toHaveProperty('status');
  });

  it('POST /api/auth/register - should give new users 1000 coins starting balance', async () => {
    const newUser = {
      username: 'balancetest',
      password: 'TestPass123',
    };

    await request(app).post('/api/auth/register').send(newUser);
    const loginRes = await request(app).post('/api/auth/login').send(newUser);

    expect(loginRes.statusCode).toEqual(200);
    expect(loginRes.body.user).toHaveProperty('balance', 1000);
  });

  it('GET /api/auth/me - should fail without token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toEqual(401);
  });
});
