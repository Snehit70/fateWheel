const mongoose = require('mongoose');
const Bet = require('./models/Bet');
const User = require('./models/User');
require('dotenv').config();

const inspect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roulette');
        console.log('Connected to MongoDB');

        // Find the user (assuming 'demo' or similar, or just list all users)
        const users = await User.find();
        console.log('Users:', users.map(u => ({ id: u._id, username: u.username, balance: u.balance, updatedAt: u.updatedAt })));

        // Find recent bets
        const bets = await Bet.find().sort({ createdAt: -1 }).limit(20);
        console.log('Recent Bets:', bets.map(b => ({
            user: b.username,
            amount: b.amount,
            status: b.status,
            createdAt: b.createdAt
        })));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

inspect();
