import * as redisClient from './redisClient';
import logger from '../utils/logger';
import type { ActiveBet, GameStateSnapshot, WheelSegment } from '../types/game';

const KEYS = {
    STATE: 'game:state',
    BETS: 'game:bets:current',
    BETS_TMP: 'game:bets:tmp',
    HISTORY: 'game:history',
};

const HISTORY_LIMIT = 15;
const STATE_TTL = 300; // 5 minutes — stale state expires if leader crashes

const getRedis = () => {
    const client = redisClient.getClient();
    if (!client || !redisClient.isReady()) return null;
    return client;
};

const parseJson = <T>(value: string): T | null => {
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
};

const isGamePhase = (value: unknown): value is GameStateSnapshot['state'] =>
    value === 'WAITING' || value === 'SPINNING' || value === 'RESULT';

export const getGameState = async (): Promise<GameStateSnapshot | null> => {
    const r = getRedis();
    if (!r) return null;

    try {
        const state = await r.hGetAll(KEYS.STATE);
        if (!state || Object.keys(state).length === 0) return null;

        const endTime = Number.parseInt(state.endTime, 10);
        const roundNumber = Number.parseInt(state.roundNumber, 10);
        if (!isGamePhase(state.state) || !state.currentRoundId || Number.isNaN(endTime) || Number.isNaN(roundNumber)) {
            return null;
        }
        return {
            state: state.state,
            endTime,
            currentRoundId: state.currentRoundId,
            roundNumber,
            result: state.result ? parseJson<WheelSegment>(state.result) : null,
            targetResult: state.targetResult ? parseJson<WheelSegment>(state.targetResult) : null,
        };
    } catch (err) {
        logger.error('Redis getGameState error', err);
        return null;
    }
};

export const setGameState = async (state: GameStateSnapshot): Promise<boolean> => {
    const r = getRedis();
    if (!r) return false;

    try {
        const data = {
            state: state.state,
            endTime: String(state.endTime),
            currentRoundId: state.currentRoundId || '',
            roundNumber: String(state.roundNumber),
            result: state.result ? JSON.stringify(state.result) : '',
            targetResult: state.targetResult ? JSON.stringify(state.targetResult) : '',
        };
        await r.multi()
            .hSet(KEYS.STATE, data)
            .expire(KEYS.STATE, STATE_TTL)
            .exec();
        return true;
    } catch (err) {
        logger.error('Redis setGameState error', err);
        return false;
    }
};

export const getActiveBets = async (): Promise<ActiveBet[]> => {
    const r = getRedis();
    if (!r) return [];

    try {
        const bets = await r.hGetAll(KEYS.BETS);
        if (!bets || Object.keys(bets).length === 0) return [];

        return Object.values(bets)
            .map(bet => parseJson<ActiveBet>(bet))
            .filter((bet): bet is ActiveBet => bet !== null);
    } catch (err) {
        logger.error('Redis getActiveBets error', err);
        return [];
    }
};

export const setActiveBet = async (betKey: string, bet: ActiveBet): Promise<boolean> => {
    const r = getRedis();
    if (!r) return false;

    try {
        await r.multi()
            .hSet(KEYS.BETS, betKey, JSON.stringify(bet))
            .expire(KEYS.BETS, STATE_TTL)
            .exec();
        return true;
    } catch (err) {
        logger.error('Redis setActiveBet error', err);
        return false;
    }
};

export const clearActiveBets = async (): Promise<boolean> => {
    const r = getRedis();
    if (!r) return false;

    try {
        await r.del(KEYS.BETS);
        return true;
    } catch (err) {
        logger.error('Redis clearActiveBets error', err);
        return false;
    }
};

export const replaceActiveBets = async (bets: ActiveBet[]): Promise<boolean> => {
    const r = getRedis();
    if (!r) return false;

    try {
        // Empty bets: just delete the live key
        if (!Array.isArray(bets) || bets.length === 0) {
            await r.del(KEYS.BETS);
            return true;
        }
        // Write all bets to temp key, then atomically swap
        await r.del(KEYS.BETS_TMP);
        for (const bet of bets) {
            const key = `${bet.userId}:${bet.type}:${bet.value}`;
            await r.hSet(KEYS.BETS_TMP, key, JSON.stringify(bet));
        }
        // Atomic swap: rename + expire in one transaction
        await r.multi()
            .rename(KEYS.BETS_TMP, KEYS.BETS)
            .expire(KEYS.BETS, STATE_TTL)
            .exec();
        return true;
    } catch (err) {
        logger.error('Redis replaceActiveBets error', err);
        return false;
    }
};

export const getHistory = async (): Promise<WheelSegment[]> => {
    const r = getRedis();
    if (!r) return [];

    try {
        const entries = await r.lRange(KEYS.HISTORY, 0, HISTORY_LIMIT - 1);
        return entries
            .map(entry => parseJson<WheelSegment>(entry))
            .filter((entry): entry is WheelSegment => entry !== null);
    } catch (err) {
        logger.error('Redis getHistory error', err);
        return [];
    }
};

export const addHistoryEntry = async (entry: WheelSegment): Promise<boolean> => {
    const r = getRedis();
    if (!r) return false;

    try {
        await r.lPush(KEYS.HISTORY, JSON.stringify(entry));
        await r.lTrim(KEYS.HISTORY, 0, HISTORY_LIMIT - 1);
        return true;
    } catch (err) {
        logger.error('Redis addHistoryEntry error', err);
        return false;
    }
};
