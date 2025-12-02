const mongoose = require('mongoose');

const gameResultSchema = new mongoose.Schema({
    number: {
        type: Number,
        required: true
    },
    color: {
        type: String,
        enum: ['red', 'black', 'green'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('GameResult', gameResultSchema);
