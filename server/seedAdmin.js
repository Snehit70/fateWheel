const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const createAdmin = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/roulette';

        if (!process.env.MONGODB_URI && !process.env.MONGO_URL && !process.env.DATABASE_URL) {
            console.warn('Warning: MONGODB_URI not found in environment, defaulting to localhost');
        }

        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const adminUsername = 'admin';
        const adminPassword = 'adminpassword123'; // Hardcoded for user request

        let admin = await User.findOne({ username: adminUsername });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        if (admin) {
            console.log('Admin already exists, updating password...');
            admin.password = hashedPassword;
            admin.status = 'approved'; // Ensure admin is approved
            await admin.save();
            console.log('Admin password updated');
            process.exit(0);
        }

        admin = new User({
            username: adminUsername,
            password: hashedPassword,
            role: 'admin',
            status: 'approved',
            balance: 1000000 // High balance for testing
        });

        await admin.save();
        console.log('Admin created successfully');
        console.log('Username:', adminUsername);
        console.log('Password:', adminPassword);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

createAdmin();
