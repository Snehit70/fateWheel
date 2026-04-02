const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const logger = require('../utils/logger');

let io = null;

const init = (httpServer, corsOptions) => {
    if (io) {
        logger.warn('Socket.io is already initialized!');
        return io;
    }

    io = new Server(httpServer, {
        cors: corsOptions,
        pingInterval: 25000,
        pingTimeout: 60000
    });

    logger.info('Socket.io initialized');
    return io;
};

const applyRedisAdapter = async (pubClient, subClient) => {
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

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized! Call init() first.');
    }
    return io;
};

const emitToUser = (userId, event, data) => {
    try {
        const ioInstance = getIO();
        ioInstance.to(`user:${userId}`).emit(event, data);
    } catch (error) {
        logger.error(`Failed to emit to user ${userId}:`, error);
    }
};

const emitToAll = (event, data) => {
    try {
        const ioInstance = getIO();
        ioInstance.emit(event, data);
    } catch (error) {
        logger.error('Failed to emit to all:', error);
    }
};

const emitToRoom = (room, event, data) => {
    try {
        const ioInstance = getIO();
        ioInstance.to(room).emit(event, data);
    } catch (error) {
        logger.error(`Failed to emit to room ${room}:`, error);
    }
};

module.exports = {
    init,
    getIO,
    applyRedisAdapter,
    emitToUser,
    emitToAll,
    emitToRoom
};
