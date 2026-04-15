import 'dotenv/config';

import mongoose from 'mongoose';

import BalanceBackup from './models/BalanceBackup';
import MigrationState from './models/MigrationState';
import User from './models/User';

const DEFAULT_MONGO_URL = 'mongodb://127.0.0.1:27017/fatewheel';
const MINIMUM_BALANCE = 1000;
const MIGRATION_NAME = 'minimum-balance-1000';

async function migrateUserBalances(): Promise<void> {
  try {
    const mongoUrl = process.env.MONGO_URL ?? DEFAULT_MONGO_URL;

    if (!process.env.MONGO_URL) {
      console.warn('Usage: MONGO_URL not found, defaulting to localhost.');
    }

    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    const session = await mongoose.startSession();
    let usersNeedingUpdate = 0;
    let backupCount = 0;
    let updatedCount = 0;

    try {
      await session.withTransaction(async () => {
        const existingMigration = await MigrationState.findOne({ migrationName: MIGRATION_NAME }).session(session);
        if (existingMigration && !existingMigration.rolledBackAt) {
          throw new Error(`Migration '${MIGRATION_NAME}' has already been run.`);
        }

        const usersToUpdate = await User.find({
          balance: { $lt: MINIMUM_BALANCE },
          role: 'user',
        }).session(session);
        const userIdsToUpdate = usersToUpdate.map(user => user._id);

        usersNeedingUpdate = usersToUpdate.length;

        await MigrationState.findOneAndUpdate(
          { migrationName: MIGRATION_NAME },
          {
            $set: {
              completedAt: new Date(),
              rolledBackAt: null,
              affectedUsers: userIdsToUpdate.length,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true, session }
        );

        if (usersToUpdate.length === 0) {
          return;
        }

        const backups = usersToUpdate.map(user => ({
          userId: user._id,
          username: user.username,
          originalBalance: user.balance,
          newBalance: MINIMUM_BALANCE,
          migrationName: MIGRATION_NAME,
          migrationDate: new Date(),
        }));

        backupCount = backups.length;
        await BalanceBackup.insertMany(backups, { session });

        const result = await User.updateMany(
          {
            _id: { $in: userIdsToUpdate },
            balance: { $lt: MINIMUM_BALANCE },
            role: 'user',
          },
          {
            $set: { balance: MINIMUM_BALANCE },
          },
          { session }
        );

        if (result.modifiedCount !== userIdsToUpdate.length) {
          throw new Error(
            'User balances changed during migration. No balances were updated; retry during a maintenance window.'
          );
        }

        updatedCount = result.modifiedCount;
      });
    } finally {
      await session.endSession();
    }

    console.log(`Found ${usersNeedingUpdate} users with balance < ${MINIMUM_BALANCE}`);
    if (usersNeedingUpdate === 0) {
      console.log('No users need balance updates. Recorded migration completion marker.');
      await mongoose.disconnect();
      process.exit(0);
      return;
    }

    console.log('Creating backups...');
    console.log(`✓ Created ${backupCount} backup records`);
    console.log(`✓ Updated ${updatedCount} users to have ${MINIMUM_BALANCE} coin balance`);
    console.log('\n📝 Backup saved. You can rollback this migration using: npm run rollback:balances');

    await mongoose.disconnect();
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    if (error instanceof Error && error.message === `Migration '${MIGRATION_NAME}' has already been run.`) {
      console.log(`⚠️  ${error.message}`);
      console.log('If you want to re-run it, first use the rollback script to undo the previous migration.');
      try {
        await mongoose.disconnect();
      } catch {
        // Ignore disconnect errors during error handling.
      }
      process.exit(1);
    }

    console.error('Error migrating user balances:', error);
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors during error handling.
    }
    process.exit(1);
  }
}

void migrateUserBalances();
