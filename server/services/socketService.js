const { Server } = require('socket.io');
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

    // Redis Adapter logic can be moved here or kept in index.js and applied to 'io'
    // For simplicity, we can expose a method to apply adapter if needed, 
    // or just return 'io' and let index.js apply it.

    logger.info('Socket.io initialized');
    return io;
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
        logger.error(`Failed to emit to all:`, error);
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
    emitToUser,
    emitToAll,
    emitToRoom
};
