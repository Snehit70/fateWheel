const rateLimit = require('express-rate-limit');

// Create a basic limiter that allows everything if configured, or defaults
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { message: "Too many login attempts, please try again later." }
});

module.exports = { authLimiter };
