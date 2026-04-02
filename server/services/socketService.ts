import { createAdapter } from '@socket.io/redis-adapter';
import type { Server as HttpServer } from 'http';
import { Server, type ServerOptions } from 'socket.io';
import logger from '../utils/logger';

let io: Server | null = null;

export const init = (httpServer: HttpServer, options: Partial<ServerOptions> = {}): Server => {
    if (io) {
        logger.warn('Socket.io is already initialized!');
        return io;
    }

    io = new Server(httpServer, {
        pingInterval: 25000,
        pingTimeout: 60000,
        ...options
    });

    logger.info('Socket.io initialized');
    return io;
};

export const applyRedisAdapter = async (
    pubClient: Parameters<typeof createAdapter>[0],
    subClient: Parameters<typeof createAdapter>[1]
): Promise<boolean> => {
    if (!io) {
        logger.error('Cannot apply Redis adapter: Socket.io not initialized');
        return false;
    }

    try {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.io Redis adapter applied');
        return true;
    } catch (err) {
        logger.error('Failed to apply Redis adapter:', err);
        return false;
    }
};

export const getIO = (): Server => {
    if (!io) {
        throw new Error('Socket.io not initialized! Call init() first.');
    }
    return io;
};

export const emitToUser = (userId: string, event: string, data: unknown): void => {
    try {
        const ioInstance = getIO();
        ioInstance.to(`user:${userId}`).emit(event, data);
    } catch (error) {
        logger.error(`Failed to emit to user ${userId}:`, error);
    }
};

export const emitToAll = (event: string, data: unknown): void => {
    try {
        const ioInstance = getIO();
        ioInstance.emit(event, data);
    } catch (error) {
        logger.error('Failed to emit to all:', error);
    }
};

export const emitToLocal = (event: string, data: unknown): void => {
    try {
        const ioInstance = getIO();
        ioInstance.local.emit(event, data);
    } catch (error) {
        logger.error('Failed to emit locally:', error);
    }
};

export const emitToRoom = (room: string, event: string, data: unknown): void => {
    try {
        const ioInstance = getIO();
        ioInstance.to(room).emit(event, data);
    } catch (error) {
        logger.error(`Failed to emit to room ${room}:`, error);
    }
};
