const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['number', 'color', 'type'] // 'type' for even/odd
    },
    value: {
        type: mongoose.Schema.Types.Mixed, // Can be number or string
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    result: {
        type: String,
        enum: ['win', 'loss']
    },
    payout: {
        type: Number,
        default: 0
    },
    gameResult: {
        number: Number,
        color: String
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'refunded'],
        default: 'active'
    },
    roundId: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

betSchema.index({ user: 1, createdAt: -1 });
betSchema.index({ roundId: 1 });
betSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Bet', betSchema);
