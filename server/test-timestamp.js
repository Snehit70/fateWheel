const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const testTimestamp = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roulette');

        const user = await User.findOne({ username: 'demo' });
        if (user) {
            console.log('Before update:', user.updatedAt);
            user.balance += 1;
            await user.save();
            console.log('After update:', user.updatedAt);
        } else {
            console.log('User demo not found');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

testTimestamp();
