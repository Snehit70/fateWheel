import { once } from 'events';

import request from 'supertest';

jest.mock('../redis/leader', () => ({
  isLeader: jest.fn(() => true),
  acquire: jest.fn(),
  onDemoted: jest.fn(),
  release: jest.fn(),
  startRenewal: jest.fn(),
}));

import { app, server } from '../index';
import Bet = require('../models/Bet');
import User = require('../models/User');
import './setup';

const { io: createClient } = require('../../client/node_modules/socket.io-client');

type BetAck = {
  success?: true;
  newBalance?: number;
  error?: string;
};

const TEST_USER = {
  username: 'socketbettor',
  password: 'Password123!',
};

const emitWithAck = (socket: ReturnType<typeof createClient>, event: string, payload: unknown): Promise<BetAck> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${event} ack timed out`));
    }, 5000);

    socket.emit(event, payload, (response: BetAck) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });

const waitForSocketEvent = (socket: ReturnType<typeof createClient>, event: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${event} event timed out`));
    }, 5000);

    socket.once(event, (payload: unknown) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });

describe('Socket placeBet integration', () => {
  let baseUrl: string;

  beforeAll(async () => {
    if (!server.listening) {
      server.listen(0);
      await once(server, 'listening');
    }

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to resolve test server address');
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

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

  const createAuthenticatedSocket = async () => {
    await request(app).post('/api/auth/register').send(TEST_USER);
    const loginResponse = await request(app).post('/api/auth/login').send(TEST_USER);

    expect(loginResponse.statusCode).toBe(200);

    const socket = createClient(baseUrl, {
      autoConnect: false,
      auth: {
        token: loginResponse.body.token,
      },
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });

    const connected = waitForSocketEvent(socket, 'connect');
    const initialGameState = waitForSocketEvent(socket, 'gameState');
    socket.connect();

    await connected;
    await initialGameState;

    return {
      socket,
      userId: loginResponse.body.user.id,
    };
  };

  it('accepts a valid socket bet and persists it', async () => {
    const { socket, userId } = await createAuthenticatedSocket();

    try {
      const response = await emitWithAck(socket, 'placeBet', {
        type: 'number',
        value: 7,
        amount: 10,
      });

      expect(response).toEqual({
        success: true,
        newBalance: 990,
      });

      const savedBet = await Bet.findOne({ user: userId, type: 'number', value: 7, status: 'active' });
      const user = await User.findById(userId);

      expect(savedBet).not.toBeNull();
      expect(savedBet?.amount).toBe(10);
      expect(user?.balance).toBe(990);
    } finally {
      socket.disconnect();
    }
  });

  it('returns a validation error for an invalid socket bet', async () => {
    const { socket, userId } = await createAuthenticatedSocket();

    try {
      const response = await emitWithAck(socket, 'placeBet', {
        type: 'number',
        value: 99,
        amount: 10,
      });

      expect(response).toEqual({
        error: 'Invalid number bet (must be 0-14)',
      });

      const savedBet = await Bet.findOne({ user: userId });
      const user = await User.findById(userId);

      expect(savedBet).toBeNull();
      expect(user?.balance).toBe(1000);
    } finally {
      socket.disconnect();
    }
  });
});
