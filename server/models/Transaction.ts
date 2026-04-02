import mongoose from 'mongoose';

import type { TransactionAttrs } from '../types/models';

const transactionSchema = new mongoose.Schema<TransactionAttrs>({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    immutable: true,
  },
  type: {
    type: String,
    enum: ['bet', 'win', 'deposit', 'withdraw', 'adjustment'],
    required: true,
    immutable: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
    immutable: true,
  },
  balanceAfter: {
    type: Number,
    required: true,
    immutable: true,
  },
  description: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });

const Transaction =
  mongoose.models.Transaction || mongoose.model<TransactionAttrs>('Transaction', transactionSchema);

export = Transaction;
