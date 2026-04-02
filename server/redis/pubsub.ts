import { createClient } from 'redis';
import * as redisClient from './redisClient';
import logger from '../utils/logger';

export const CHANNELS = {
    STATE_CHANGE: 'game:state-changes',
    BET_UPDATE: 'game:bet-updates',
} as const;

type RedisClient = ReturnType<typeof createClient>;

let subscriber: RedisClient | null = null;
let publisher: RedisClient | null = null;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const init = async (): Promise<boolean> => {
    if (!redisClient.isReady()) {
        logger.warn('Redis not available, pub/sub disabled');
        return false;
    }

    try {
        // Use the main client for publishing
        publisher = redisClient.getClient();

        // Create a dedicated subscriber client (Redis requires separate connections for pub/sub)
        subscriber = createClient({
            url: REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) return new Error('Subscriber max retries reached');
                    return Math.min(retries * 100, 3000);
                }
            }
        });
        subscriber.on('error', (err: Error) => {
            logger.error('Redis subscriber error', err);
        });
        await subscriber.connect();

        logger.info('Redis pub/sub initialized');
        return true;
    } catch (err) {
        logger.warn('Redis pub/sub init failed', {
            error: err instanceof Error ? err.message : String(err)
        });
        subscriber = null;
        publisher = null;
        return false;
    }
};

export const publish = async (channel: string, data: unknown): Promise<boolean> => {
    if (!publisher) return false;

    try {
        await publisher.publish(channel, JSON.stringify(data));
        return true;
    } catch (err) {
        logger.error('Redis publish error', err);
        return false;
    }
};

export const subscribe = async (
    channel: string,
    callback: (data: unknown) => void | Promise<void>
): Promise<boolean> => {
    if (!subscriber) return false;

    try {
        await subscriber.subscribe(channel, (message) => {
            try {
                const data = JSON.parse(message);
                callback(data);
            } catch (err) {
                logger.error('Redis subscribe parse error', err);
            }
        });
        logger.info(`Subscribed to Redis channel: ${channel}`);
        return true;
    } catch (err) {
        logger.error('Redis subscribe error', err);
        return false;
    }
};

export const disconnect = async (): Promise<void> => {
    if (subscriber) {
        try {
            await subscriber.unsubscribe();
            await subscriber.quit();
        } catch (err) {
            logger.error('Error disconnecting Redis subscriber:', err);
        }
        subscriber = null;
    }
};
