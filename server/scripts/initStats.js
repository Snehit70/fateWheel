require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Bet = require('../models/Bet');
const GameStats = require('../models/GameStats');
const path = require('path');

// Fix for dotenv not finding .env if run from different dir
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/roulette');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
};

const initStats = async () => {
    try {
        await connectDB();

        console.log("Calculating stats...");

        const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
        const pendingUsers = await User.countDocuments({ status: 'pending' });

        const betStats = await Bet.aggregate([
            {
                $match: { status: { $ne: 'refunded' } }
            },
            {
                $group: {
                    _id: null,
                    totalBets: { $sum: 1 },
                    totalWagered: { $sum: '$amount' },
                    totalPayouts: { $sum: '$payout' }
                }
            }
        ]);

        const statsData = betStats[0] || { totalBets: 0, totalWagered: 0, totalPayouts: 0 };
        const netProfit = statsData.totalWagered - statsData.totalPayouts;

        console.log("Stats calculated:");
        console.log(`Total Users: ${totalUsers}`);
        console.log(`Net Profit: ${netProfit}`);
        console.log(`Total Bets: ${statsData.totalBets}`);

        // Update or Create
        let stats = await GameStats.findOne();
        if (stats) {
            stats.totalUsers = totalUsers;
            stats.pendingUsers = pendingUsers;
            stats.netProfit = netProfit;
            stats.totalBets = statsData.totalBets;
            stats.totalWagered = statsData.totalWagered;
            await stats.save();
            console.log("Stats updated");
        } else {
            await GameStats.create({
                totalUsers,
                pendingUsers,
                netProfit,
                totalBets: statsData.totalBets,
                totalWagered: statsData.totalWagered
            });
            console.log("Stats created");
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

initStats();
