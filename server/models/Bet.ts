import mongoose from 'mongoose';

import type { BetAttrs } from '../types/models';

const betSchema = new mongoose.Schema<BetAttrs>({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['number', 'color', 'type'],
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator(this: BetAttrs, value: BetAttrs['value']) {
        if (this.type === 'number') {
          return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 14;
        }
        if (this.type === 'color') {
          return ['red', 'black', 'green'].includes(String(value));
        }
        if (this.type === 'type') {
          return ['even', 'odd'].includes(String(value));
        }
        return false;
      },
      message: (props: { value: unknown; path: string }) =>
        `${String(props.value)} is not a valid value for bet type ${props.path}`,
    },
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
  },
  result: {
    type: String,
    enum: ['win', 'loss'],
  },
  payout: {
    type: Number,
    default: 0,
  },
  balanceAfter: {
    type: Number,
  },
  gameResult: {
    number: Number,
    color: String,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'refunded', 'cancelled'],
    default: 'active',
  },
  roundId: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

betSchema.index({ user: 1, createdAt: -1 });
betSchema.index({ roundId: 1 });
betSchema.index({ createdAt: -1 });
betSchema.index({ status: 1, roundId: 1 });

const Bet = mongoose.models.Bet || mongoose.model<BetAttrs>('Bet', betSchema);

export = Bet;
