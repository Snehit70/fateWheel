import mongoose from 'mongoose';

import type { AdminLogAttrs } from '../types/models';

const adminLogSchema = new mongoose.Schema<AdminLogAttrs>({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: ['delete_user', 'update_balance', 'withdraw_profit', 'update_credentials'],
    required: true,
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  targetUsername: {
    type: String,
    required: true,
  },
  details: {
    type: String,
  },
  reason: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

adminLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AdminLog = mongoose.models.AdminLog || mongoose.model<AdminLogAttrs>('AdminLog', adminLogSchema);

export = AdminLog;
