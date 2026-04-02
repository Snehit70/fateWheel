const crypto = require('crypto');
const redisClient = require('./redisClient');
const logger = require('../utils/logger');

const LOCK_KEY = 'game:leader';
const LOCK_TTL = 30; // seconds

const instanceId = crypto.randomUUID();
let isLeaderInstance = false;
let renewalInterval = null;

const acquire = async () => {
    const r = redisClient.getClient();
    if (!r || !redisClient.isReady()) {
        // No Redis = single server mode, always leader
        isLeaderInstance = true;
        logger.info('No Redis, running as single-server leader');
        return true;
    }

    try {
        const result = await r.set(LOCK_KEY, instanceId, {
            NX: true,
            EX: LOCK_TTL,
        });

        if (result === 'OK') {
            isLeaderInstance = true;
            logger.info(`Acquired leader lock (instance: ${instanceId})`);
            return true;
        }

        // Check if we already hold the lock
        const current = await r.get(LOCK_KEY);
        if (current === instanceId) {
            isLeaderInstance = true;
            await r.expire(LOCK_KEY, LOCK_TTL);
            return true;
        }

        isLeaderInstance = false;
        return false;
    } catch (err) {
        logger.error('Leader acquire error:', err);
        // On error, assume leader in single-server mode
        isLeaderInstance = true;
        return true;
    }
};

const release = async () => {
    const r = redisClient.getClient();
    if (!r || !redisClient.isReady()) {
        isLeaderInstance = false;
        return;
    }

    try {
        // Only delete if we hold the lock
        const current = await r.get(LOCK_KEY);
        if (current === instanceId) {
            await r.del(LOCK_KEY);
            logger.info('Released leader lock');
        }
    } catch (err) {
        logger.error('Leader release error:', err);
    } finally {
        isLeaderInstance = false;
        stopRenewal();
    }
};

const renew = async () => {
    const r = redisClient.getClient();
    if (!r || !redisClient.isReady()) return;

    try {
        const current = await r.get(LOCK_KEY);
        if (current === instanceId) {
            await r.expire(LOCK_KEY, LOCK_TTL);
        } else {
            // Lost leadership
            isLeaderInstance = false;
            stopRenewal();
            logger.warn('Lost leader lock, switching to follower mode');
        }
    } catch (err) {
        logger.error('Leader renew error:', err);
    }
};

const startRenewal = () => {
    if (renewalInterval) return;

    // Renew at half the TTL to prevent expiry
    renewalInterval = setInterval(() => {
        renew();
    }, (LOCK_TTL / 2) * 1000);
};

const stopRenewal = () => {
    if (renewalInterval) {
        clearInterval(renewalInterval);
        renewalInterval = null;
    }
};

const isLeader = () => isLeaderInstance;
const getInstanceId = () => instanceId;

module.exports = {
    acquire, release, renew,
    startRenewal, stopRenewal,
    isLeader, getInstanceId,
};
