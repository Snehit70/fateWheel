import mongoose from 'mongoose';

import type { GameResultAttrs } from '../types/models';

const gameResultSchema = new mongoose.Schema<GameResultAttrs>({
  roundId: {
    type: String,
    required: true,
    unique: true,
  },
  roundNumber: {
    type: Number,
    required: true,
    index: true,
  },
  number: {
    type: Number,
    required: true,
    min: 0,
    max: 14,
  },
  color: {
    type: String,
    enum: ['red', 'black', 'green'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  stats: {
    totalBets: { type: Number, min: 0 },
    totalWagered: { type: Number, min: 0 },
    totalPayout: { type: Number, min: 0 },
    netProfit: Number,
    uniqueUsers: { type: Number, min: 0 },
  },
});

const GameResult = mongoose.models.GameResult || mongoose.model<GameResultAttrs>('GameResult', gameResultSchema);

export = GameResult;
