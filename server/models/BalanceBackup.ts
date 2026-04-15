import mongoose from 'mongoose';

interface BalanceBackupAttrs {
  userId: mongoose.Types.ObjectId;
  username: string;
  originalBalance: number;
  newBalance: number;
  migrationDate: Date;
  migrationName: string;
}

const balanceBackupSchema = new mongoose.Schema<BalanceBackupAttrs>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    username: {
      type: String,
      required: true,
    },
    originalBalance: {
      type: Number,
      required: true,
    },
    newBalance: {
      type: Number,
      required: true,
    },
    migrationDate: {
      type: Date,
      default: Date.now,
    },
    migrationName: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Create compound index for efficient queries
balanceBackupSchema.index({ migrationName: 1, userId: 1 });

const BalanceBackup =
  mongoose.models.BalanceBackup || mongoose.model<BalanceBackupAttrs>('BalanceBackup', balanceBackupSchema);

export = BalanceBackup;
