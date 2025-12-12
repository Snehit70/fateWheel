const mongoose = require('mongoose');

const gameStatsSchema = new mongoose.Schema({
    totalUsers: {
        type: Number,
        default: 0
    },
    pendingUsers: {
        type: Number,
        default: 0
    },
    netProfit: {
        type: Number,
        default: 0
    },
    totalBets: {
        type: Number,
        default: 0
    },
    totalWagered: {
        type: Number,
        default: 0
    }
}, { timestamps: true }); // timestamps: true auto-creates updatedAt and createdAt

// Singleton pattern: We only ever want one document
// Uses findOneAndUpdate with upsert for concurrency safety
gameStatsSchema.statics.getStats = async function () {
    try {
        const stats = await this.findOneAndUpdate(
            {},
            { $setOnInsert: { totalUsers: 0, pendingUsers: 0, netProfit: 0, totalBets: 0, totalWagered: 0 } },
            { upsert: true, new: true }
        );
        return stats;
    } catch (error) {
        console.error('Error fetching GameStats:', error);
        throw error;
    }
};

module.exports = mongoose.model('GameStats', gameStatsSchema);
