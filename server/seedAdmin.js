const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const adminUsername = 'admin';
        const adminPassword = 'adminpassword123'; // Hardcoded for user request

        let admin = await User.findOne({ username: adminUsername });
        if (admin) {
            console.log('Admin already exists');
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        admin = new User({
            username: adminUsername,
            password: hashedPassword,
            role: 'admin',
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
