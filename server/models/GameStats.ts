import mongoose from 'mongoose';

import type { GameStatsAttrs, GameStatsDocument, GameStatsModel } from '../types/models';

const GAME_STATS_SINGLETON_ID = new mongoose.Types.ObjectId('000000000000000000000001');

const gameStatsSchema = new mongoose.Schema<GameStatsAttrs, GameStatsModel>(
  {
    totalUsers: {
      type: Number,
      default: 0,
    },
    pendingUsers: {
      type: Number,
      default: 0,
    },
    netProfit: {
      type: Number,
      default: 0,
    },
    totalBets: {
      type: Number,
      default: 0,
    },
    totalWagered: {
      type: Number,
      default: 0,
    },
    lastDate: {
      type: String,
      default: '',
    },
    dailyNonce: {
      type: Number,
      default: 0,
    },
    withdrawalLockUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

gameStatsSchema.statics.getStats = async function getStats(): Promise<GameStatsDocument> {
  try {
    const stats = await this.findOneAndUpdate(
      { _id: GAME_STATS_SINGLETON_ID },
      {
        $setOnInsert: {
          _id: GAME_STATS_SINGLETON_ID,
          totalUsers: 0,
          pendingUsers: 0,
          netProfit: 0,
          totalBets: 0,
          totalWagered: 0,
        },
      },
      { upsert: true, new: true }
    );

    if (!stats) {
      throw new Error('GameStats could not be initialized');
    }

    return stats;
  } catch (error) {
    console.error('Error fetching GameStats:', error);
    throw error;
  }
};

const GameStats =
  mongoose.models.GameStats || mongoose.model<GameStatsAttrs, GameStatsModel>('GameStats', gameStatsSchema);

export = GameStats;
