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

    await mongoose.connect(mongoUrl, { dbName: 'fatewheel' });
    console.log('Connected to MongoDB');

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';

    console.log(`Checking Admin: ${adminUsername}`);

    const existingAdmin = await User.findOne({ username: adminUsername });

    if (existingAdmin) {
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('Admin user exists. Updated role to ensure access.');
    } else {
      console.log('Creating new Admin...');

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      const admin = new User({
        username: adminUsername,
        password: hashedPassword,
        role: 'admin',
        balance: 10000,
      });
      await admin.save();
      console.log('MongoDB Admin Created.');
    }

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
