import mongoose from 'mongoose';

import type { BetAttrs } from '../types/models';

type BetValidationContext = {
  type?: unknown;
  getUpdate?: () => Record<string, unknown> | undefined;
};

const getBetTypeFromContext = (context: BetValidationContext): unknown => {
  if (typeof context.type === 'string') {
    return context.type;
  }

  const update = context.getUpdate?.();
  if (!update) {
    return undefined;
  }

  const directType = update.type;
  if (typeof directType === 'string') {
    return directType;
  }

  const setType = update.$set;
  if (setType && typeof setType === 'object' && 'type' in setType) {
    return (setType as { type?: unknown }).type;
  }

  const setOnInsertType = update.$setOnInsert;
  if (setOnInsertType && typeof setOnInsertType === 'object' && 'type' in setOnInsertType) {
    return (setOnInsertType as { type?: unknown }).type;
  }

  return undefined;
};

const isValidBetValue = (betType: unknown, value: BetAttrs['value']): boolean => {
  if (betType === 'number') {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 14;
  }

  if (betType === 'color') {
    return ['red', 'black', 'green'].includes(String(value));
  }

  if (betType === 'type') {
    return ['even', 'odd'].includes(String(value));
  }

  return false;
};

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
      validator(this: BetValidationContext, value: BetAttrs['value']) {
        return isValidBetValue(getBetTypeFromContext(this), value);
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
