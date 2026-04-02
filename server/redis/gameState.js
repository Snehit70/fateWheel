const redisClient = require('./redisClient');
const logger = require('../utils/logger');

const KEYS = {
    STATE: 'game:state',
    BETS: 'game:bets:current',
    HISTORY: 'game:history',
};

const HISTORY_LIMIT = 15;

const getRedis = () => {
    const client = redisClient.getClient();
    if (!client || !redisClient.isReady()) return null;
    return client;
};

const getGameState = async () => {
    const r = getRedis();
    if (!r) return null;

    try {
        const state = await r.hGetAll(KEYS.STATE);
        if (!state || Object.keys(state).length === 0) return null;

        return {
            state: state.state,
            endTime: parseInt(state.endTime, 10) || 0,
            currentRoundId: state.currentRoundId || null,
            roundNumber: parseInt(state.roundNumber, 10) || 0,
            result: state.result ? JSON.parse(state.result) : null,
        };
    } catch (err) {
        logger.error('Redis getGameState error:', err);
        return null;
    }
};

const setGameState = async (state) => {
    const r = getRedis();
    if (!r) return false;

    try {
        const data = {
            state: state.state,
            endTime: String(state.endTime),
            currentRoundId: state.currentRoundId || '',
            roundNumber: String(state.roundNumber),
            result: state.result ? JSON.stringify(state.result) : '',
        };
        await r.hSet(KEYS.STATE, data);
        return true;
    } catch (err) {
        logger.error('Redis setGameState error:', err);
        return false;
    }
};

const getActiveBets = async () => {
    const r = getRedis();
    if (!r) return [];

    try {
        const bets = await r.hGetAll(KEYS.BETS);
        if (!bets || Object.keys(bets).length === 0) return [];

        return Object.values(bets).map(b => JSON.parse(b));
    } catch (err) {
        logger.error('Redis getActiveBets error:', err);
        return [];
    }
};

const setActiveBet = async (betKey, bet) => {
    const r = getRedis();
    if (!r) return false;

    try {
        await r.hSet(KEYS.BETS, betKey, JSON.stringify(bet));
        return true;
    } catch (err) {
        logger.error('Redis setActiveBet error:', err);
        return false;
    }
};

const clearActiveBets = async () => {
    const r = getRedis();
    if (!r) return false;

    try {
        await r.del(KEYS.BETS);
        return true;
    } catch (err) {
        logger.error('Redis clearActiveBets error:', err);
        return false;
    }
};

const getHistory = async () => {
    const r = getRedis();
    if (!r) return [];

    try {
        const entries = await r.lRange(KEYS.HISTORY, 0, HISTORY_LIMIT - 1);
        return entries.map(e => JSON.parse(e));
    } catch (err) {
        logger.error('Redis getHistory error:', err);
        return [];
    }
};

const addHistoryEntry = async (entry) => {
    const r = getRedis();
    if (!r) return false;

    try {
        await r.lPush(KEYS.HISTORY, JSON.stringify(entry));
        await r.lTrim(KEYS.HISTORY, 0, HISTORY_LIMIT - 1);
        return true;
    } catch (err) {
        logger.error('Redis addHistoryEntry error:', err);
        return false;
    }
};

module.exports = {
    getGameState, setGameState,
    getActiveBets, setActiveBet, clearActiveBets,
    getHistory, addHistoryEntry,
};
