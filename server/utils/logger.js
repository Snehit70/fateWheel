const winston = require('winston');

// Determine log level from environment (default: info, development: debug)
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const winstonLogger = winston.createLogger({
    level: LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(
                    info => {
                        // Filter out undefined values for cleaner output
                        const meta = Object.assign({}, info);
                        delete meta.level;
                        delete meta.message;
                        delete meta.timestamp;
                        delete meta.stack;
                        const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
                        const stackStr = info.stack ? '\n' + info.stack : '';
                        return `${info.timestamp} ${info.level}: ${info.message}${stackStr}${metaStr}`;
                    }
                )
            )
        })
    ]
});

const logger = {
    /**
     * Log informational messages
     */
    info: (message, meta = {}) => {
        winstonLogger.info(message, meta);
    },

    /**
     * Log warning messages
     */
    warn: (message, meta = {}) => {
        winstonLogger.warn(message, meta);
    },

    /**
     * Log error messages with optional Error object
     */
    error: (message, error = null, meta = {}) => {
        if (error instanceof Error) {
            winstonLogger.error(message, { ...meta, error: error.message, stack: error.stack });
        } else if (error) {
            winstonLogger.error(message, { ...meta, error: error });
        } else {
            winstonLogger.error(message, meta);
        }
    },

    /**
     * Log debug messages (only shown when LOG_LEVEL=debug)
     */
    debug: (message, meta = {}) => {
        winstonLogger.debug(message, meta);
    }
};

/**
 * Express middleware for request logging
 * Logs method, URL, status code, and response time
 */
logger.requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'debug';

        logger[logLevel](`${req.method} ${req.originalUrl}`, {
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress
        });
    });

    next();
};

module.exports = logger;
