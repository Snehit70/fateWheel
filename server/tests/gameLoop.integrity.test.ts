import bcrypt from 'bcryptjs';

import GameLoop from '../game/GameLoop';
import Bet = require('../models/Bet');
import Transaction = require('../models/Transaction');
import User = require('../models/User');
import './setup';

jest.mock('../services/socketService', () => ({
  emitToAll: jest.fn(),
  emitToUser: jest.fn(),
  emitToRoom: jest.fn(),
}));

jest.mock('../redis/gameState', () => ({
  addHistoryEntry: jest.fn().mockResolvedValue(true),
  clearActiveBets: jest.fn().mockResolvedValue(true),
  getActiveBets: jest.fn().mockResolvedValue([]),
  getGameState: jest.fn().mockResolvedValue(null),
  getHistory: jest.fn().mockResolvedValue([]),
  replaceActiveBets: jest.fn().mockResolvedValue(true),
  setActiveBet: jest.fn().mockResolvedValue(true),
  setGameState: jest.fn().mockResolvedValue(true),
}));

jest.mock('../redis/pubsub', () => ({
  CHANNELS: {
    BET_UPDATE: 'bet:update',
    STATE_CHANGE: 'state:change',
  },
  publish: jest.fn().mockResolvedValue(true),
}));

jest.mock('../redis/leader', () => ({
  isLeader: jest.fn(() => true),
}));

describe('GameLoop integrity', () => {
  const createUser = async (overrides: Partial<{ balance: number; username: string }> = {}) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123', salt);

    return User.create({
      username: overrides.username ?? `user${Date.now()}`,
      password: hashedPassword,
      role: 'user',
      balance: overrides.balance ?? 1000,
    });
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rolls back the balance debit when bet persistence fails', async () => {
    const user = await createUser({ balance: 1000, username: 'bettor1' });
    const gameLoop = new GameLoop();
    gameLoop.state = 'WAITING';
    gameLoop.currentRoundId = 'round-atomic-place-bet';

    jest.spyOn(Bet, 'findOneAndUpdate').mockRejectedValueOnce(new Error('bet write failed'));

    await expect(
      gameLoop.placeBet(
        { id: user._id.toString(), role: 'user', username: user.username },
        { type: 'number', value: 7, amount: 100 }
      )
    ).rejects.toThrow('bet write failed');

    const refreshedUser = await User.findById(user._id);
    const bets = await Bet.find({ user: user._id });
    const transactions = await Transaction.find({ user: user._id });

    expect(refreshedUser?.balance).toBe(1000);
    expect(bets).toHaveLength(0);
    expect(transactions).toHaveLength(0);
  });

  it('keeps bets active and balance unchanged when settlement fails mid-flight', async () => {
    const user = await createUser({ balance: 900, username: 'bettor2' });
    const gameLoop = new GameLoop();
    gameLoop.state = 'SPINNING';
    gameLoop.currentRoundId = 'round-settlement-atomicity';
    gameLoop.targetResult = { number: 8, color: 'red' };
    gameLoop.running = true;

    await Bet.create({
      user: user._id,
      username: user.username,
      type: 'number',
      value: 8,
      amount: 100,
      roundId: gameLoop.currentRoundId,
      status: 'active',
      createdAt: new Date(),
    });

    const bulkWriteSpy = jest.spyOn(Bet, 'bulkWrite').mockRejectedValueOnce(new Error('settlement failed'));
    const clearActiveBets = jest.requireMock('../redis/gameState').clearActiveBets as jest.Mock;

    await gameLoop.processResults();

    const refreshedUser = await User.findById(user._id);
    const bets = await Bet.find({ user: user._id, roundId: gameLoop.currentRoundId });
    const transactions = await Transaction.find({ user: user._id, type: 'win' });

    expect(bulkWriteSpy).toHaveBeenCalled();
    expect(refreshedUser?.balance).toBe(900);
    expect(bets).toHaveLength(1);
    expect(bets[0].status).toBe('active');
    expect(transactions).toHaveLength(0);
    expect(clearActiveBets).not.toHaveBeenCalled();
    expect(gameLoop.running).toBe(false);
  });
});
