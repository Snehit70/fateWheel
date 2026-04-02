import type { NextFunction, Request, Response } from 'express';
import { createClient } from 'redis';
import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';

import logger from '../utils/logger';

const AUTH_RATE_LIMIT_POINTS = 5;
const AUTH_RATE_LIMIT_DURATION_SECONDS = 15 * 60;
const AUTH_LIMITER_KEY_PREFIX = 'rl:auth';
const REDIS_URL = process.env.REDIS_URL;

const memoryLimiter = new RateLimiterMemory({
  keyPrefix: AUTH_LIMITER_KEY_PREFIX,
  points: AUTH_RATE_LIMIT_POINTS,
  duration: AUTH_RATE_LIMIT_DURATION_SECONDS,
});

let authLimiterStore = memoryLimiter;

if (REDIS_URL && process.env.NODE_ENV !== 'test') {
  const redisLimiterClient = createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: retries => {
        if (retries > 10) {
          return new Error('Auth rate limiter Redis max retries reached');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  redisLimiterClient.on('error', (error: Error) => {
    logger.warn('Auth rate limiter Redis client error; using insurance limiter', {
      error: error.message,
    });
  });

  void redisLimiterClient.connect().catch(error => {
    logger.warn('Auth rate limiter Redis connection failed; using insurance limiter', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  authLimiterStore = new RateLimiterRedis({
    storeClient: redisLimiterClient,
    useRedisPackage: true,
    keyPrefix: AUTH_LIMITER_KEY_PREFIX,
    points: AUTH_RATE_LIMIT_POINTS,
    duration: AUTH_RATE_LIMIT_DURATION_SECONDS,
    insuranceLimiter: memoryLimiter,
  });
}

const getClientKey = (req: Request): string => req.ip || req.socket.remoteAddress || 'unknown';

const setRateLimitHeaders = (res: Response, rateLimiterRes: RateLimiterRes): void => {
  res.setHeader('RateLimit-Limit', AUTH_RATE_LIMIT_POINTS.toString());
  res.setHeader('RateLimit-Remaining', Math.max(rateLimiterRes.remainingPoints, 0).toString());
  res.setHeader('RateLimit-Reset', Math.ceil(rateLimiterRes.msBeforeNext / 1000).toString());
};

export async function authLimiter(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
  const clientKey = getClientKey(req);

  try {
    const rateLimiterRes = await authLimiterStore.consume(clientKey);
    setRateLimitHeaders(res, rateLimiterRes);

    res.on('finish', () => {
      if (res.statusCode < 400) {
        void authLimiterStore.reward(clientKey, 1).catch(error => {
          logger.warn('Failed to reward successful auth request in rate limiter', {
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
    });

    next();
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      setRateLimitHeaders(res, error);
      res.setHeader('Retry-After', Math.ceil(error.msBeforeNext / 1000).toString());
      return res.status(429).json({ message: 'Too many login attempts, please try again later.' });
    }

    logger.warn('Auth rate limiter failed open due to unexpected error', {
      error: error instanceof Error ? error.message : String(error),
    });
    next();
  }
}
