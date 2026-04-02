import type { SocketAuthUser } from './game';

declare global {
  namespace Express {
    interface Request {
      user?: SocketAuthUser;
    }
  }
}

export {};
