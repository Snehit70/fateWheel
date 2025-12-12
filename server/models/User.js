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
        sparse: true
    },
    password: {
        type: String,
        required: false, // Optional, managed by Supabase
        validate: {
            validator: function (v) {
                // Only validate length if password is provided
                return !v || v.length >= 8;
            },
            message: 'Password must be at least 8 characters long'
        }
    },
    balance: {
        type: Number,
        default: 0,
        min: 0,
        // Math.floor to remove penny/decimal changes
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
}, { timestamps: true }); // timestamps: true auto-creates createdAt and updatedAt

// Add index on createdAt for sorting users by registration date
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
