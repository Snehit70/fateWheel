import 'dotenv/config';

import mongoose from 'mongoose';

import BalanceBackup from './models/BalanceBackup';
import MigrationState from './models/MigrationState';
import User from './models/User';

const DEFAULT_MONGO_URL = 'mongodb://127.0.0.1:27017/fatewheel';
const MIGRATION_NAME = 'minimum-balance-1000';

async function rollbackUserBalances(): Promise<void> {
  try {
    const mongoUrl = process.env.MONGO_URL ?? DEFAULT_MONGO_URL;

    if (!process.env.MONGO_URL) {
      console.warn('Usage: MONGO_URL not found, defaulting to localhost.');
    }

    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    const migrationState = await MigrationState.findOne({ migrationName: MIGRATION_NAME });

    // Find all backup records for this migration
    const backups = await BalanceBackup.find({ migrationName: MIGRATION_NAME });

    if (backups.length === 0) {
      if (migrationState && !migrationState.rolledBackAt) {
        console.log(`Migration '${MIGRATION_NAME}' is marked complete, but no backup records were found.`);
        console.log('Automatic rollback is unavailable because the backup records are missing.');
        await mongoose.disconnect();
        process.exit(1);
        return;
      }

      console.log(`No backup records found for migration '${MIGRATION_NAME}'.`);
      console.log('Either the migration was never run, or it has already been rolled back.');
      await mongoose.disconnect();
      process.exit(0);
      return;
    }

    console.log(`Found ${backups.length} backup records to restore.`);
    console.log('\n⚠️  WARNING: This will restore user balances to their pre-migration values.');
    console.log('Press Ctrl+C within 5 seconds to cancel...\n');

    // Give user time to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Starting rollback...');

    let restoredCount = 0;
    let errorCount = 0;
    const restoreLogs: string[] = [];

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const backup of backups) {
          const result = await User.updateOne(
            { _id: backup.userId },
            { $set: { balance: backup.originalBalance } },
            { session }
          );

          if (result.matchedCount === 0) {
            throw new Error(`Failed to restore ${backup.username}: user not found`);
          }

          if (result.modifiedCount > 0) {
            restoredCount++;
            restoreLogs.push(`✓ Restored ${backup.username}: ${backup.newBalance} → ${backup.originalBalance}`);
          } else {
            restoreLogs.push(`⊘ Skipped ${backup.username}: balance already ${backup.originalBalance}`);
          }
        }

        await BalanceBackup.deleteMany({ migrationName: MIGRATION_NAME }, { session });

        if (migrationState) {
          await MigrationState.updateOne(
            { migrationName: MIGRATION_NAME },
            { $set: { rolledBackAt: new Date() } },
            { session }
          );
        }
      });
    } catch (err) {
      errorCount++;
      console.error('Rollback aborted:', err);
    } finally {
      await session.endSession();
    }

    if (errorCount === 0) {
      for (const restoreLog of restoreLogs) {
        console.log(restoreLog);
      }
      console.log(`\n✓ Deleted ${backups.length} backup records`);
    } else {
      console.log(`\n⚠️  Keeping backup records due to ${errorCount} errors`);
    }

    console.log('\n=== Rollback Summary ===');
    console.log(`Successfully restored: ${restoredCount} users`);
    console.log(`Errors: ${errorCount}`);

    await mongoose.disconnect();
    console.log('\nRollback completed.');
    process.exit(errorCount === 0 ? 0 : 1);
  } catch (error) {
    console.error('Error rolling back user balances:', error);
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors during error handling.
    }
    process.exit(1);
  }
}

void rollbackUserBalances();
