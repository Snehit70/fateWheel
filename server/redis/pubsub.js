const { createClient } = require('redis');
const redisClient = require('./redisClient');
const logger = require('../utils/logger');

const CHANNELS = {
    STATE_CHANGE: 'game:state-changes',
    BET_UPDATE: 'game:bet-updates',
};

let subscriber = null;
let publisher = null;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const init = async () => {
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
        subscriber.on('error', (err) => {
            logger.error('Redis subscriber error:', err.message);
        });
        await subscriber.connect();

        logger.info('Redis pub/sub initialized');
        return true;
    } catch (err) {
        logger.warn('Redis pub/sub init failed:', err.message);
        subscriber = null;
        publisher = null;
        return false;
    }
};

const publish = async (channel, data) => {
    if (!publisher) return false;

    try {
        await publisher.publish(channel, JSON.stringify(data));
        return true;
    } catch (err) {
        logger.error('Redis publish error:', err);
        return false;
    }
};

const subscribe = async (channel, callback) => {
    if (!subscriber) return false;

    try {
        await subscriber.subscribe(channel, (message) => {
            try {
                const data = JSON.parse(message);
                callback(data);
            } catch (err) {
                logger.error('Redis subscribe parse error:', err);
            }
        });
        logger.info(`Subscribed to Redis channel: ${channel}`);
        return true;
    } catch (err) {
        logger.error('Redis subscribe error:', err);
        return false;
    }
};

const disconnect = async () => {
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

module.exports = {
    init, publish, subscribe, disconnect,
    CHANNELS,
};
