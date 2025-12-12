const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    supabaseUid: {
        type: String,
        unique: true,
        index: true,
        sparse: true // Allows null/undefined for legacy users if any
    },
    password: {
        type: String,
        required: false, // Now optional as we use Supabase Auth
        minlength: 8
    },
    balance: {
        type: Number,
        default: 0, // Initial balance
        min: 0,
        set: v => Math.floor(v)
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
