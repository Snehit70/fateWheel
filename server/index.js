require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const GameLoop = require('./game/GameLoop');
const jwt = require('jsonwebtoken');
const { RateLimiterMemory, RateLimiterRedis } = require('rate-limiter-flexible');
const logger = require('./utils/logger'); // Import logger at the top

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Railway)
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
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

// Module-level Rate Limiter (prevents connection exhaustion)
let rateLimiter;
let rateLimiterRedisClient = null;

if (process.env.REDIS_URL) {
    const { createClient } = require('redis');
    rateLimiterRedisClient = createClient({ url: process.env.REDIS_URL });
    rateLimiterRedisClient.connect().catch(err => logger.error('Rate Limiter Redis error:', err));

    rateLimiter = new RateLimiterRedis({
        storeClient: rateLimiterRedisClient,
        points: parseInt(process.env.SOCKET_RATE_LIMIT_POINTS, 10) || 5, // requests per second
        duration: 1,
        keyPrefix: 'socket_rate_limit'
    });
} else {
    rateLimiter = new RateLimiterMemory({
        points: parseInt(process.env.SOCKET_RATE_LIMIT_POINTS, 10) || 5, // requests per second
        duration: 1,
    });
}

// Separate rate limiter for timeSync (less strict)
const timeSyncRateLimiter = new RateLimiterMemory({
    points: parseInt(process.env.TIMESYNC_RATE_LIMIT_POINTS, 10) || 10, // requests per second
    duration: 1,
});

// Middleware
app.use(require('helmet')());
app.use(cors());
app.use(express.json());



// Attach IO to request for routes
app.use((req, res, next) => {
    req.io = io;
    next();
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
mongoose.connect(MONGO_URL, { dbName: 'roulette' })
    .then(() => logger.info('Connected to MongoDB (DB: roulette)'))
    .catch(err => logger.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/game', require('./routes/game'));

app.get('/', (req, res) => {
    res.send('Roulette Server is running');
});

// Initialize Game Loop
const gameLoop = new GameLoop(io);

// Crash Recovery: Refund any active bets from previous session
gameLoop.refundActiveBets();

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

io.on('connection', (socket) => {
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

    // Send initial state
    socket.emit('gameState', {
        state: gameLoop.state,
        timeLeft: gameLoop.timeLeft,
        bets: gameLoop.bets,
        history: gameLoop.history,
        result: gameLoop.result
    });

    // Rate limit helper using module-level rate limiter
    const checkRateLimit = async (eventName) => {
        try {
            await rateLimiter.consume(`${socket.id}:${eventName}`);
            return true;
        } catch (rejRes) {
            return false;
        }
    };

    socket.on('placeBet', async (betData, callback) => {
        // Ensure callback is a function
        if (typeof callback !== 'function') return;

        if (!socket.user) {
            return callback({ error: "Please login to bet" });
        }
        if (!await checkRateLimit('placeBet')) {
            return callback({ error: "Rate limit exceeded. Please slow down." });
        }

        // Input sanitization - only extract expected fields
        const sanitizedBetData = {
            type: betData?.type,
            value: betData?.value,
            amount: betData?.amount
        };

        try {
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
        if (!await checkRateLimit('clearBets')) {
            return callback({ error: "Rate limit exceeded. Please slow down." });
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
        // Clean up rate limiter (not needed for flexible-rate-limiter as it handles expiration)
    });

    socket.on('timeSync', async (callback) => {
        // Ensure callback is a function
        if (typeof callback !== 'function') return;

        // Rate limit timeSync to prevent abuse
        try {
            await timeSyncRateLimiter.consume(socket.id);
            callback(Date.now());
        } catch (rejRes) {
            // Silently drop if rate limited (timeSync is non-critical)
        }
    });
});

// Global Error Handlers
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

const PORT = process.env.PORT || 3000;

// Global Error Handler for Express
app.use((err, req, res, next) => {
    logger.error('Unhandled Error', err);
    res.status(500).json({ message: 'Internal Server Error' });
});

server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
