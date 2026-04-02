import crypto from 'crypto';
import * as redisClient from './redisClient';
import logger from '../utils/logger';

const LOCK_KEY = 'game:leader';
const LOCK_TTL = 30; // seconds

const instanceId = crypto.randomUUID();
let isLeaderInstance = false;
let renewalInterval: NodeJS.Timeout | null = null;
const demotionListeners = new Set<() => void>();

const demoteToFollower = (reason: string): void => {
    if (!isLeaderInstance && !renewalInterval) {
        return;
    }

    isLeaderInstance = false;
    stopRenewal();
    logger.warn(reason);

    for (const listener of demotionListeners) {
        try {
            listener();
        } catch (error) {
            logger.error('Leader demotion listener failed', error);
        }
    }
};

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
    if (!redisClient.isConfigured()) {
        isLeaderInstance = true;
        logger.info('No Redis configured, running as single-server leader');
        return true;
    }

    const r = redisClient.getClient();

    // Redis configured but not available — fail-closed, stay follower
    if (!r || !redisClient.isReady()) {
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
    if (!redisClient.isConfigured()) {
        isLeaderInstance = false;
        stopRenewal();
        return;
    }

    const r = redisClient.getClient();
    if (!r || !redisClient.isReady()) {
        demoteToFollower('Leader release skipped because Redis is unavailable');
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
    if (!r || !redisClient.isReady()) {
        if (redisClient.isConfigured()) {
            demoteToFollower('Lost leader lock because Redis is unavailable');
        }
        return;
    }

    try {
        // Atomic compare-and-expire via Lua script
        const result = await r.eval(RENEW_SCRIPT, {
            keys: [LOCK_KEY],
            arguments: [instanceId, String(LOCK_TTL)],
        });

        if (Number(result) === 0) {
            demoteToFollower('Lost leader lock, switching to follower mode');
        }
    } catch (err) {
        logger.error('Leader renew error', err);
        demoteToFollower('Leader renewal failed, switching to follower mode');
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

export const onDemoted = (listener: () => void): (() => void) => {
    demotionListeners.add(listener);
    return () => {
        demotionListeners.delete(listener);
    };
};

export const isLeader = (): boolean => isLeaderInstance;
export const getInstanceId = (): string => instanceId;
