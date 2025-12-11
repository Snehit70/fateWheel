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
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Singleton pattern: We only ever want one document
gameStatsSchema.statics.getStats = async function () {
    let stats = await this.findOne();
    if (!stats) {
        stats = await this.create({});
    }
    return stats;
};

module.exports = mongoose.model('GameStats', gameStatsSchema);
