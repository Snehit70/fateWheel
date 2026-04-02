import crypto from 'crypto';
import * as redisClient from './redisClient';
import logger from '../utils/logger';

const LOCK_KEY = 'game:leader';
const LOCK_TTL = 30; // seconds

const instanceId = crypto.randomUUID();
let isLeaderInstance = false;
let renewalInterval: NodeJS.Timeout | null = null;

// Atomic Lua scripts to prevent TOCTOU race conditions
// Compare-and-expire: only extend TTL if we still own the lock
const RENEW_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("EXPIRE", KEYS[1], ARGV[2])
else
    return 0
end
`;

// Compare-and-delete: only delete if we still own the lock
const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
`;

export const acquire = async (): Promise<boolean> => {
    const r = redisClient.getClient();

    // Redis intentionally not configured — single-server mode, always leader
    if (!r) {
        isLeaderInstance = true;
        logger.info('No Redis configured, running as single-server leader');
        return true;
    }

    // Redis configured but not available — fail-closed, stay follower
    if (!redisClient.isReady()) {
        isLeaderInstance = false;
        logger.warn('Redis configured but not ready, staying follower');
        return false;
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
            // Use atomic Lua script to extend TTL
            await r.eval(RENEW_SCRIPT, {
                keys: [LOCK_KEY],
                arguments: [instanceId, String(LOCK_TTL)],
            });
            return true;
        }

        isLeaderInstance = false;
        return false;
    } catch (err) {
        // Fail-closed on Redis errors — don't create split-brain
        isLeaderInstance = false;
        logger.error('Leader acquire error, staying follower', err);
        return false;
    }
};

export const release = async (): Promise<void> => {
    const r = redisClient.getClient();
    if (!r || !redisClient.isReady()) {
        isLeaderInstance = false;
        return;
    }

    try {
        // Atomic compare-and-delete via Lua script
        await r.eval(RELEASE_SCRIPT, {
            keys: [LOCK_KEY],
            arguments: [instanceId],
        });
        logger.info('Released leader lock');
    } catch (err) {
        logger.error('Leader release error:', err);
    } finally {
        isLeaderInstance = false;
        stopRenewal();
    }
};

export const renew = async (): Promise<void> => {
    const r = redisClient.getClient();
    if (!r || !redisClient.isReady()) return;

    try {
        // Atomic compare-and-expire via Lua script
        const result = await r.eval(RENEW_SCRIPT, {
            keys: [LOCK_KEY],
            arguments: [instanceId, String(LOCK_TTL)],
        });

        if (Number(result) === 0) {
            // Lost leadership
            isLeaderInstance = false;
            stopRenewal();
            logger.warn('Lost leader lock, switching to follower mode');
        }
    } catch (err) {
        logger.error('Leader renew error', err);
    }
};

export const startRenewal = (): void => {
    if (renewalInterval) return;

    // Renew at half the TTL to prevent expiry
    renewalInterval = setInterval(() => {
        renew();
    }, (LOCK_TTL / 2) * 1000);
};

export const stopRenewal = (): void => {
    if (renewalInterval) {
        clearInterval(renewalInterval);
        renewalInterval = null;
    }
};

export const isLeader = (): boolean => isLeaderInstance;
export const getInstanceId = (): string => instanceId;
