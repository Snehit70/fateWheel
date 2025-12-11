const mongoose = require('mongoose');

const gameResultSchema = new mongoose.Schema({
    roundId: {
        type: String,
        required: true,
        unique: true,
        index: true
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
    }
});

module.exports = mongoose.model('GameResult', gameResultSchema);
