import type { NextFunction, Request, Response } from 'express';

import User from '../models/User';

async function admin(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  try {
    if (!req.user) {
      return res.status(500).send('Server Error');
    }

    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    next();
  } catch {
    return res.status(500).send('Server Error');
  }
}

export = admin;
