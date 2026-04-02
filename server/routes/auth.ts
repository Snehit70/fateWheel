import bcrypt from 'bcryptjs';
import express, { type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';

import { authLimiter } from '../middleware/rateLimiter';
import User from '../models/User';
import * as socketService from '../services/socketService';
import type { AuthTokenPayload } from '../types/game';
import logger from '../utils/logger';
import auth = require('../middleware/auth');

const router = express.Router();

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const username = normalizeText(req.body?.username).toLowerCase();
    const password = normalizeText(req.body?.password);

    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    if (!username || !/^[a-zA-Z0-9]+$/.test(username)) {
      return res.status(400).json({ message: 'Username can only contain letters and numbers' });
    }

    let user = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') },
    });

    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username,
      password: hashedPassword,
    });

    await user.save();

    socketService.emitToRoom('admin-room', 'admin:newUser', user);
    socketService.emitToRoom('admin-room', 'admin:statsUpdate', {});

    return res.json({ message: 'Registration successful. You can now login.' });
  } catch (err) {
    logger.error('Registration failed', err, { username: req.body?.username as unknown });
    return res.status(500).send('Server error');
  }
});

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const username = normalizeText(req.body?.username);
    const password = normalizeText(req.body?.password);

    const user = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload: AuthTokenPayload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    const token = await new Promise<string>((resolve, reject) => {
      jwt.sign(payload, process.env.JWT_SECRET ?? '', { expiresIn: '1y' }, (error, signedToken) => {
        if (error || !signedToken) {
          reject(error ?? new Error('Token generation failed'));
          return;
        }
        resolve(signedToken);
      });
    });

    return res.json({
      token,
      user: { id: user.id, username: user.username, balance: user.balance, role: user.role },
    });
  } catch (err) {
    logger.error('Login failed', err);
    return res.status(500).send('Server error');
  }
});

router.get('/me', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      id: user.id,
      username: user.username,
      balance: user.balance,
      role: user.role,
    });
  } catch (err) {
    logger.error('Get user failed', err, { userId: req.user?.id });
    return res.status(500).send('Server error');
  }
});

router.put('/update-credentials', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const currentPassword = normalizeText(req.body?.currentPassword);
    const newUsername = normalizeText(req.body?.newUsername);
    const newPassword = normalizeText(req.body?.newPassword);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password' });
    }

    if (newUsername) {
      const normalizedUsername = newUsername.toLowerCase();
      if (normalizedUsername !== user.username) {
        const exists = await User.findOne({ username: normalizedUsername });
        if (exists) {
          return res.status(400).json({ message: 'Username already taken' });
        }
        user.username = normalizedUsername;
      }
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    if (user.role === 'admin') {
      socketService.emitToRoom('admin-room', 'admin:userUpdate', user);
    }

    return res.json({
      message: 'Credentials updated successfully',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error('Failed to update credentials', err, { userId: req.user?.id });
    return res.status(500).send('Server error');
  }
});

export = router;
