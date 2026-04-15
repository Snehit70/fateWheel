# Balance Migration Guide

This guide explains how to migrate existing users to have the new minimum balance of 1000 coins.

## Overview

Starting with this update, all **new users** automatically receive 1000 coins when they register. However, **existing users** who registered before this change may still have their old balance (often 0 coins).

This migration system ensures backward compatibility by:
- Updating existing users to have the minimum 1000 coin balance
- Creating automatic backups before any changes
- Providing a safe rollback mechanism if needed

## Files

- `migrateUserBalances.ts` - Migration script
- `rollbackUserBalances.ts` - Rollback script
- `models/BalanceBackup.ts` - Backup data model
- `models/MigrationState.ts` - Durable migration completion marker

## Running the Migration

### Prerequisites

Make sure your MongoDB connection is configured in `.env`:
```bash
MONGO_URL=mongodb://127.0.0.1:27017/fatewheel
```

### Execute Migration

From the `server` directory:

```bash
npm run migrate:balances
```

Or with a custom database URL:

```bash
MONGO_URL=mongodb://your-db-url npm run migrate:balances
```

### What It Does

1. Checks a durable migration marker to prevent duplicate runs even after backup cleanup
2. Finds all users with `balance < 1000` and `role = 'user'`
3. **Creates backup records** of original balances
4. Updates users to have 1000 coin balance inside the same transaction snapshot
5. Reports success with rollback instructions

### Example Output

```
Connected to MongoDB
Found 47 users with balance < 1000
Creating backups...
✓ Created 47 backup records
✓ Updated 47 users to have 1000 coin balance

📝 Backup saved. You can rollback this migration using: npm run rollback:balances
Migration completed successfully.
```

## Rolling Back the Migration

If you need to undo the migration and restore original balances:

```bash
npm run rollback:balances
```

### What It Does

1. Finds all backup records for this migration
2. **Waits 5 seconds** to give you time to cancel (Ctrl+C)
3. Restores each user's original balance
4. Deletes backup records after successful rollback
5. Reports detailed summary

### Example Output

```
Connected to MongoDB
Found 47 backup records to restore.

⚠️  WARNING: This will restore user balances to their pre-migration values.
Press Ctrl+C within 5 seconds to cancel...

Starting rollback...
✓ Restored alice: 1000 → 0
✓ Restored bob: 1000 → 250
✓ Restored charlie: 1000 → 0
...

✓ Deleted 47 backup records

=== Rollback Summary ===
Successfully restored: 47 users
Errors: 0

Rollback completed.
```

## Safety Features

### Idempotency
- Migration writes a durable completion marker in `migrationstates`
- Attempting to re-run shows a warning and exits safely even if backups were cleaned up
- Successful rollback marks the migration as rolled back so it can be rerun intentionally

### Data Integrity
- All original balances are backed up before changes
- Backup records stored in `balancebackups` collection
- Migration completion state stored in `migrationstates` collection
- Admin users are never affected (only `role = 'user'`)
- Migration runs in a transaction so backup and balance updates stay in sync

### Rollback Protection
- 5-second countdown before rollback starts
- Detailed per-user restoration logging
- Backup records kept if any errors occur
- Backup-first recovery workflow for safe manual rollback

## Database Schema

### BalanceBackup Collection

```typescript
{
  userId: ObjectId,          // Reference to User
  username: string,           // For easy identification
  originalBalance: number,    // Balance before migration
  newBalance: number,         // Balance after migration (1000)
  migrationName: string,      // "minimum-balance-1000"
  migrationDate: Date,        // When migration ran
  createdAt: Date,
  updatedAt: Date
}
```

### MigrationState Collection

```typescript
{
  migrationName: string,      // "minimum-balance-1000"
  completedAt: Date,          // When migration last completed
  rolledBackAt: Date | null,  // Set after successful rollback
  affectedUsers: number,
  createdAt: Date,
  updatedAt: Date
}
```

## Troubleshooting

### Migration Already Run

```
⚠️  Migration 'minimum-balance-1000' has already been run.
If you want to re-run it, first use the rollback script...
```

**Solution:** Use `npm run rollback:balances` first, then re-run the migration.

### No Backups Found

```
No backup records found for migration 'minimum-balance-1000'.
```

**Reason:** Migration was never run, or it was already rolled back.

### Database Connection Failed

**Check:**
- Is MongoDB running?
- Is `MONGO_URL` correct in `.env`?
- Do you have network access to the database?

## Best Practices

### Before Migration
1. **Backup your database** (separate from the script's backup)
2. Test on a development/staging environment first
3. Notify users about the balance update if applicable

### During Migration
1. Run during low-traffic periods
2. Monitor the output for errors
3. Verify the count of updated users matches expectations

### After Migration
1. Verify in your database that balances were updated:
   ```javascript
   db.users.find({ role: 'user', balance: { $lt: 1000 } }).count()
   // Should return 0
   ```
2. Test user login and gameplay
3. Keep backup records for at least 24-48 hours before cleaning up manually (if needed)

## Manual Cleanup

If you're confident the migration was successful and don't need the backup anymore, you can manually remove backup records:

```javascript
// In MongoDB shell
db.balancebackups.deleteMany({ migrationName: 'minimum-balance-1000' })
```

**Note:** This is normally done automatically during rollback, so manual cleanup is usually unnecessary. Manual backup cleanup does not remove the durable migration marker and does make automatic rollback unavailable later.

## Future Migrations

This migration system is reusable. To create a new balance migration:

1. Change `MIGRATION_NAME` in both scripts to a unique name
2. Adjust `MINIMUM_BALANCE` or migration logic as needed
3. Update this guide with new migration name
4. Follow the same run/rollback process

## Questions?

If you encounter issues:
1. Check the MongoDB logs
2. Verify your `.env` configuration
3. Ensure you have proper database permissions
4. Review the script output for specific error messages
