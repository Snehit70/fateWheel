const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs:
    parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // default: 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20, // default: 20 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    message:
      "Too many login attempts from this IP, please try again after 15 minutes",
  },
});

module.exports = { authLimiter };
