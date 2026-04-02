import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import type { AuthTokenPayload } from '../types/game';

const isAuthTokenPayload = (value: unknown): value is AuthTokenPayload => {
  if (typeof value !== 'object' || value === null || !('user' in value)) {
    return false;
  }

  const { user } = value as { user: unknown };
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    'role' in user &&
    typeof (user as { id: unknown }).id === 'string' &&
    typeof (user as { role: unknown }).role === 'string'
  );
};

function auth(req: Request, res: Response, next: NextFunction): Response | void {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? '');
    if (!isAuthTokenPayload(decoded)) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = decoded.user;
    next();
  } catch {
    return res.status(401).json({ message: 'Token is not valid' });
  }
}

export = auth;
