const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const verifyDecimals = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({});
        const badUsers = users.filter(u => u.balance % 1 !== 0);

        if (badUsers.length > 0) {
            console.log(`FAILED: Found ${badUsers.length} users with decimal balances.`);
            badUsers.forEach(u => console.log(`- ${u.username}: ${u.balance}`));
        } else {
            console.log('SUCCESS: All users have integer balances.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

verifyDecimals();
