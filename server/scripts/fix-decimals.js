const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fixDecimals = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const users = await User.find({});
        let count = 0;

        for (const user of users) {
            if (user.balance % 1 !== 0) {
                const oldBalance = user.balance;
                const newBalance = Math.floor(oldBalance);

                // We can just save the user, and the new setter in schema will handle it, 
                // but let's be explicit here too.
                user.balance = newBalance;
                await user.save();

                console.log(`Updated user ${user.username}: ${oldBalance} -> ${newBalance}`);
                count++;
            }
        }

        console.log(`Migration complete. Fixed ${count} users.`);
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
        process.exit(0);
    }
};

fixDecimals();
