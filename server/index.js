require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketService = require('./services/socketService');
const GameLoop = require('./game/GameLoop');
const logger = require('./utils/logger');
const User = require('./models/User');
const Bet = require('./models/Bet');
const jwt = require('jsonwebtoken');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Railway)
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Initialize Socket.io via Service
const io = socketService.init(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"]
    },
    pingInterval: 25000,
    pingTimeout: 60000
});

// Redis Adapter for Scalability
if (process.env.REDIS_URL) {
    const { createClient } = require('redis');
    const { createAdapter } = require('@socket.io/redis-adapter');

    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Redis Adapter connected');
    }).catch(err => {
        logger.error('Redis Adapter error:', err);
    });
}

// Middleware
app.use(require('helmet')());
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use(logger.requestLogger); // Request logging

// Routes
// Note: req.io middleware removed. Routes should import socketService.
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/game', require('./routes/game'));
app.get('/health', (req, res) => res.json({ status: "running" }))
app.get('/', (req, res) => {
    res.send('Roulette Server is running');
});

// Database Connection
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT_NAME;
let MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
    if (isProduction) {
        logger.error('Critical Error: MONGO_URL not found in environment variables.');
        process.exit(1);
    } else {
        logger.warn('Warning: MONGO_URL not found in environment, defaulting to localhost for development.');
        MONGO_URL = 'mongodb://127.0.0.1:27017/roulette';
    }
}

if (!process.env.JWT_SECRET) {
    logger.error('Critical Error: JWT_SECRET must be defined in environment variables.');
    process.exit(1);
}

if (!process.env.CLIENT_URL) {
    logger.error('Critical Error: CLIENT_URL must be defined in environment variables for CORS.');
    process.exit(1);
}

if (process.env.NODE_ENV !== 'test') {
    mongoose.connect(MONGO_URL, {
        dbName: 'roulette',
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    })
        .then(() => logger.info('Connected to MongoDB (DB: roulette)'))
        .catch(err => logger.error('MongoDB connection error:', err));
}

// Global Error Handler for Express
app.use((err, req, res, next) => {
    logger.error('Unhandled Error', err);
    res.status(500).json({ message: 'Internal Server Error' });
});

// Socket.io Middleware for Auth (Optional for connection, required for betting)
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Validate JWT payload structure
            if (decoded.user && decoded.user.id) {
                socket.user = decoded.user;
            }
        } catch (err) {
            // Invalid token, but we allow connection for spectating
        }
    }
    next();
});

const PORT = process.env.PORT || 3000;
const gameLoop = new GameLoop(); // No args needed, uses socketService internally

if (require.main === module) {
    // Initialize Game Loop (starts round ID generation, refunding, and loop)
    gameLoop.init();

    server.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
}

io.on('connection', async (socket) => {
    logger.info(`A user connected: ${socket.id} ${socket.user ? `(User: ${socket.user.id})` : '(Guest)'}`);

    // Join user room if authenticated
    if (socket.user) {
        socket.join(`user:${socket.user.id}`);
        logger.info(`Socket ${socket.id} joined room user:${socket.user.id}`);

        // Join admin room if user is admin (role checked from token, verify from DB for production)
        if (socket.user.role === 'admin') {
            socket.join('admin-room');
            logger.info(`Socket ${socket.id} joined admin-room`);
        }
    }

    // Load active bets from DB (survives server restart, always fresh)
    let activeBets = [];
    try {
        if (gameLoop.currentRoundId) {
            const dbBets = await Bet.find({
                status: 'active',
                roundId: gameLoop.currentRoundId
            }).select('user username type value amount').lean();

            // Transform to match UI format
            activeBets = dbBets.map(b => ({
                userId: b.user.toString(),
                username: b.username,
                type: b.type,
                value: b.value,
                amount: b.amount
            }));
        }
    } catch (err) {
        logger.error('Failed to load bets for new connection:', err);
        activeBets = gameLoop.bets; // Fallback to memory cache
    }

    // Send initial state
    socket.emit('gameState', {
        state: gameLoop.state,
        timeLeft: gameLoop.timeLeft,
        bets: activeBets,
        history: gameLoop.history,
        result: gameLoop.result
    });

    socket.on('placeBet', async (betData, callback) => {
        // Ensure callback is a function
        if (typeof callback !== 'function') return;

        if (!socket.user) {
            return callback({ error: "Please login to bet" });
        }

        try {
            // Re-fetch user to ensure status is up-to-date (critical for blocking banned/rejected users)
            const user = await User.findById(socket.user.id);

            if (!user) {
                return callback({ error: "User not found" });
            }

            if (user.status !== 'approved') {
                return callback({ error: "Account restricted. Contact admin." });
            }

            // Update socket user with latest data just in case
            socket.user.role = user.role;
            socket.user.status = user.status;

            // Input sanitization - only extract expected fields
            const sanitizedBetData = {
                type: betData?.type,
                value: betData?.value,
                amount: betData?.amount
            };

            const newBalance = await gameLoop.placeBet(socket.user, sanitizedBetData);
            callback({ success: true, newBalance });
        } catch (err) {
            callback({ error: err.message });
        }
    });

    socket.on('clearBets', async (callback) => {
        // Ensure callback is a function
        if (typeof callback !== 'function') return;

        if (!socket.user) {
            return callback({ error: "Please login" });
        }

        try {
            const newBalance = await gameLoop.clearBets(socket.user);
            callback({ success: true, newBalance });
        } catch (err) {
            callback({ error: err.message });
        }
    });

    socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.id}`);
    });

    socket.on('timeSync', (callback) => {
        // Ensure callback is a function
        if (typeof callback !== 'function') return;
        callback(Date.now());
    });

    // Re-sync state on visibility change (client requests fresh state when returning to tab)
    socket.on('requestState', async () => {
        // Load fresh bets from DB
        let activeBets = [];
        try {
            if (gameLoop.currentRoundId) {
                const dbBets = await Bet.find({
                    status: 'active',
                    roundId: gameLoop.currentRoundId
                }).select('user username type value amount').lean();

                activeBets = dbBets.map(b => ({
                    userId: b.user.toString(),
                    username: b.username,
                    type: b.type,
                    value: b.value,
                    amount: b.amount
                }));
            }
        } catch (err) {
            logger.error('Failed to load bets for requestState:', err);
            activeBets = gameLoop.bets;
        }

        socket.emit('gameState', {
            state: gameLoop.state,
            timeLeft: gameLoop.timeLeft,
            bets: activeBets,
            history: gameLoop.history,
            result: gameLoop.result,
            endTime: gameLoop.endTime
        });
    });
});

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);

    server.close(() => {
        logger.info('HTTP server closed');
    });

    try {
        await mongoose.disconnect();
        logger.info('MongoDB connection closed');
    } catch (err) {
        logger.error('Error closing MongoDB connection:', err);
    }

    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = { app, server };
