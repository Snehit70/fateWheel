const mongoose = require('mongoose');

const gameResultSchema = new mongoose.Schema({
    roundId: {
        type: String,
        required: true,
        unique: true // unique already creates an index
    },
    roundNumber: {
        type: Number,
        required: true,
        index: true
    },
    number: {
        type: Number,
        required: true,
        min: 0,
        max: 14
    },
    color: {
        type: String,
        enum: ['red', 'black', 'green'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    stats: {
        totalBets: { type: Number, min: 0 },
        totalWagered: { type: Number, min: 0 },
        totalPayout: { type: Number, min: 0 },
        // netProfit: positive = house profit, negative = house loss
        netProfit: Number,
        uniqueUsers: { type: Number, min: 0 }
    }
});

module.exports = mongoose.model('GameResult', gameResultSchema);
