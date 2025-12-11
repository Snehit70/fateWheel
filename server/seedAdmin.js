const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const createAdmin = async () => {
    try {
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT_NAME;

        let MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL;

        if (!MONGODB_URI) {
            if (isProduction) {
                console.error('Critical Error: MongoDB connection string not found in environment variables (MONGODB_URI, MONGO_URL, or DATABASE_URL).');
                console.error('This is required for production/Railway deployments.');
                process.exit(1);
            } else {
                console.warn('Warning: MONGODB_URI not found in environment, defaulting to localhost for development.');
                MONGODB_URI = 'mongodb://127.0.0.1:27017/roulette';
            }
        }

        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';

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
