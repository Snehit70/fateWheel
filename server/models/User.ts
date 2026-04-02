import mongoose from 'mongoose';

import type { UserAttrs } from '../types/models';

const userSchema = new mongoose.Schema<UserAttrs>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9]+$/, 'Username can only contain letters and numbers'],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    balance: {
      type: Number,
      default: 0,
      set: (value: number) => Math.floor(value),
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model<UserAttrs>('User', userSchema);

export = User;
