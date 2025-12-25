const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,  // Automatically convert to lowercase
        match: [/^[a-zA-Z0-9]+$/, 'Username can only contain letters and numbers']
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    balance: {
        type: Number,
        default: 0, // Initial balance
        set: v => Math.floor(v)
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    allowPasswordReset: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
