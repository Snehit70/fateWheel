import 'dotenv/config';

import mongoose from 'mongoose';

import BalanceBackup from './models/BalanceBackup';
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

    // Find all backup records for this migration
    const backups = await BalanceBackup.find({ migrationName: MIGRATION_NAME });

    if (backups.length === 0) {
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

    // Restore each user's balance
    for (const backup of backups) {
      try {
        const result = await User.updateOne(
          { _id: backup.userId },
          { $set: { balance: backup.originalBalance } }
        );

        if (result.modifiedCount > 0) {
          restoredCount++;
          console.log(`✓ Restored ${backup.username}: ${backup.newBalance} → ${backup.originalBalance}`);
        } else {
          console.log(`⊘ Skipped ${backup.username}: User not found or balance unchanged`);
        }
      } catch (err) {
        errorCount++;
        console.error(`✗ Failed to restore ${backup.username}:`, err);
      }
    }

    // Delete the backup records after successful rollback
    if (errorCount === 0) {
      await BalanceBackup.deleteMany({ migrationName: MIGRATION_NAME });
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
