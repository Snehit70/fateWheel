const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        immutable: true
    },
    type: {
        type: String,
        enum: ['bet', 'win', 'deposit', 'withdraw', 'adjustment'],
        required: true,
        immutable: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
        immutable: true
    },
    balanceAfter: {
        type: Number,
        required: true,
        immutable: true
    },
    description: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

TransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
