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
        required: true,
        validate: {
            validator: function (v) {
                if (this.type === 'number') {
                    return Number.isInteger(v) && v >= 0 && v <= 14;
                } else if (this.type === 'color') {
                    return ['red', 'black', 'green'].includes(v);
                } else if (this.type === 'type') {
                    return ['even', 'odd'].includes(v);
                }
                return false;
            },
            message: props => `${props.value} is not a valid value for bet type ${props.path}`
        }
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
    balanceAfter: {
        type: Number
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
betSchema.index({ status: 1, roundId: 1 }); // Optimized for processing active bets

module.exports = mongoose.model('Bet', betSchema);
