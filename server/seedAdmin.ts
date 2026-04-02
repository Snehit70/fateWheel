import 'dotenv/config';

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import User from './models/User';

const DEFAULT_MONGO_URL = 'mongodb://127.0.0.1:27017/fatewheel';

async function createAdmin(): Promise<void> {
  try {
    const mongoUrl = process.env.MONGO_URL ?? DEFAULT_MONGO_URL;

    if (!process.env.MONGO_URL) {
      console.warn('Usage: MONGO_URL not found, defaulting to localhost.');
    }

    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    const adminUsername = process.env.ADMIN_USERNAME?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set');
    }

    console.log(`Checking Admin: ${adminUsername}`);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    await User.findOneAndUpdate(
      { username: adminUsername },
      {
        $set: { role: 'admin' },
        $setOnInsert: {
          username: adminUsername,
          password: hashedPassword,
          balance: 10000,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    console.log('MongoDB Admin Created or Updated.');

    await mongoose.disconnect();
    console.log('Seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors during error handling.
    }
    process.exit(1);
  }
}

void createAdmin();
