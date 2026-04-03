import { createClient } from 'redis';
import logger from '../utils/logger';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let isConnected = false;

const REDIS_URL = process.env.REDIS_URL;
const hasConfiguredRedis = typeof REDIS_URL === 'string' && REDIS_URL.trim().length > 0;

export const connect = async (): Promise<RedisClient | null> => {
    if (!hasConfiguredRedis || !REDIS_URL) {
        client = null;
        isConnected = false;
        return null;
    }

    if (client && isConnected) return client;

    try {
        client = createClient({
            url: REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) return new Error('Redis max retries reached');
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        client.on('error', (err: Error) => {
            logger.error('Redis client error', err);
            isConnected = false;
        });

        client.on('reconnecting', () => {
            logger.info('Redis client reconnecting...');
        });

        client.on('ready', () => {
            isConnected = true;
            logger.info('Redis client connected');
        });

        await client.connect();
        isConnected = true;
        logger.info('Redis connected successfully');
        return client;
    } catch (err) {
        logger.warn('Redis connection failed, Redis-backed features remain disabled', {
            error: err instanceof Error ? err.message : String(err)
        });
        client = null;
        isConnected = false;
        return null;
    }
};

export const getClient = (): RedisClient | null => client;

export const isReady = (): boolean => isConnected && client !== null;
export const isConfigured = (): boolean => hasConfiguredRedis;

export const disconnect = async (): Promise<void> => {
    if (client) {
        try {
            await client.quit();
            logger.info('Redis client disconnected');
        } catch (err) {
            logger.error('Error disconnecting Redis:', err);
        }
        client = null;
        isConnected = false;
    }
};
