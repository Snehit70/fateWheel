import 'dotenv/config';

import mongoose from 'mongoose';

import BalanceBackup from './models/BalanceBackup';
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

    // Check if this migration has already been run
    const existingBackup = await BalanceBackup.findOne({ migrationName: MIGRATION_NAME });
    if (existingBackup) {
      console.log(`⚠️  Migration '${MIGRATION_NAME}' has already been run.`);
      console.log('If you want to re-run it, first use the rollback script to undo the previous migration.');
      await mongoose.disconnect();
      process.exit(1);
      return;
    }

    // Find all users with balance less than 1000 and role 'user'
    const usersToUpdate = await User.find({
      balance: { $lt: MINIMUM_BALANCE },
      role: 'user',
    });

    console.log(`Found ${usersToUpdate.length} users with balance < ${MINIMUM_BALANCE}`);

    if (usersToUpdate.length === 0) {
      console.log('No users need balance updates.');
      await mongoose.disconnect();
      process.exit(0);
      return;
    }

    // Create backups for all users before updating
    console.log('Creating backups...');
    const backups = usersToUpdate.map(user => ({
      userId: user._id,
      username: user.username,
      originalBalance: user.balance,
      newBalance: MINIMUM_BALANCE,
      migrationName: MIGRATION_NAME,
      migrationDate: new Date(),
    }));

    await BalanceBackup.insertMany(backups);
    console.log(`✓ Created ${backups.length} backup records`);

    // Update all users to have minimum balance
    const result = await User.updateMany(
      {
        balance: { $lt: MINIMUM_BALANCE },
        role: 'user',
      },
      {
        $set: { balance: MINIMUM_BALANCE },
      }
    );

    console.log(`✓ Updated ${result.modifiedCount} users to have ${MINIMUM_BALANCE} coin balance`);
    console.log('\n📝 Backup saved. You can rollback this migration using: npm run rollback:balances');

    await mongoose.disconnect();
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
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
