import mongoose from 'mongoose';

interface MigrationStateAttrs {
  migrationName: string;
  completedAt: Date;
  rolledBackAt?: Date | null;
  affectedUsers: number;
}

const migrationStateSchema = new mongoose.Schema<MigrationStateAttrs>(
  {
    migrationName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    completedAt: {
      type: Date,
      required: true,
    },
    rolledBackAt: {
      type: Date,
      default: null,
    },
    affectedUsers: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

const MigrationState =
  mongoose.models.MigrationState || mongoose.model<MigrationStateAttrs>('MigrationState', migrationStateSchema);

export = MigrationState;
