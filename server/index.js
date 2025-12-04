require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const GameLoop = require('./game/GameLoop');
const jwt = require('jsonwebtoken');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Railway)
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());



// Attach IO to request for routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/roulette';

if (!process.env.MONGODB_URI && !process.env.MONGO_URL && !process.env.DATABASE_URL) {
    logger.error('Critical Error: MONGODB_URI, MONGO_URL, or DATABASE_URL must be defined in environment variables.');
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    logger.error('Critical Error: JWT_SECRET must be defined in environment variables.');
    process.exit(1);
}
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

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
            socket.user = decoded.user;
        } catch (err) {
            // Invalid token, but we allow connection for spectating
        }
    }
    next();
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id, socket.user ? `(User: ${socket.user.id})` : '(Guest)');

    // Join user room if authenticated
    if (socket.user) {
        socket.join(`user:${socket.user.id}`);
        console.log(`Socket ${socket.id} joined room user:${socket.user.id}`);
    }

    // Send initial state
    socket.emit('gameState', {
        state: gameLoop.state,
        timeLeft: gameLoop.timeLeft,
        bets: gameLoop.bets,
        history: gameLoop.history,
        result: gameLoop.result
    });

    // Rate Limiter
    const rateLimiter = new Map();
    const RATE_LIMIT_WINDOW = 1000; // 1 second
    const MAX_REQUESTS = 5; // 5 requests per second

    const checkRateLimit = (eventName) => {
        const now = Date.now();
        const key = `${socket.id}:${eventName}`;
        const userRequests = rateLimiter.get(key) || [];

        // Filter out old requests
        const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);

        if (recentRequests.length >= MAX_REQUESTS) {
            return false;
        }

        recentRequests.push(now);
        rateLimiter.set(key, recentRequests);
        return true;
    };

    socket.on('placeBet', async (betData, callback) => {
        if (!socket.user) {
            return callback({ error: "Please login to bet" });
        }
        if (!checkRateLimit('placeBet')) {
            return callback({ error: "Rate limit exceeded. Please slow down." });
        }
        try {
            const newBalance = await gameLoop.placeBet(socket.user, betData);
            callback({ success: true, newBalance });
        } catch (err) {
            callback({ error: err.message });
        }
    });

    socket.on('clearBets', async (callback) => {
        if (!socket.user) {
            return callback({ error: "Please login" });
        }
        if (!checkRateLimit('clearBets')) {
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
        console.log('User disconnected:', socket.id);
        // Clean up rate limiter
        rateLimiter.delete(`${socket.id}:placeBet`);
        rateLimiter.delete(`${socket.id}:clearBets`);
    });
});

const PORT = process.env.PORT || 3000;
const logger = require('./utils/logger');

// Global Error Handler
app.use((err, req, res, next) => {
    logger.error('Unhandled Error', err);
    res.status(500).json({ message: 'Internal Server Error' });
});

server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
