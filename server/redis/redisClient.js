const { createClient } = require('redis');
const logger = require('../utils/logger');

let client = null;
let isConnected = false;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connect = async () => {
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

        client.on('error', (err) => {
            logger.error('Redis client error:', err.message);
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
        logger.warn('Redis connection failed, running in single-server mode:', err.message);
        client = null;
        isConnected = false;
        return null;
    }
};

const getClient = () => client;

const isReady = () => isConnected && client !== null;

const disconnect = async () => {
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

module.exports = { connect, getClient, isReady, disconnect };
