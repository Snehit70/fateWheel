import type { RequestHandler } from 'express';
import winston from 'winston';

// Determine log level from environment (default: info, development: debug)
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export type LogMeta = Record<string, unknown>;
type Logger = {
    info: (message: string, meta?: LogMeta) => void;
    warn: (message: string, meta?: LogMeta) => void;
    error: (message: string, error?: unknown, meta?: LogMeta) => void;
    debug: (message: string, meta?: LogMeta) => void;
    requestLogger: RequestHandler;
};

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
                        const { level, message, timestamp, stack, ...meta } = info;
                        const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
                        const stackStr = stack ? '\n' + stack : '';
                        return `${timestamp} ${level}: ${message}${stackStr}${metaStr}`;
                    }
                )
            )
        })
    ]
});

const logger: Logger = {
    info: (message: string, meta: LogMeta = {}) => {
        winstonLogger.info(message, meta);
    },

    warn: (message: string, meta: LogMeta = {}) => {
        winstonLogger.warn(message, meta);
    },

    error: (message: string, error: unknown = null, meta: LogMeta = {}) => {
        if (error instanceof Error) {
            winstonLogger.error(message, { ...meta, error: error.message, stack: error.stack });
        } else if (error) {
            winstonLogger.error(message, { ...meta, error: error });
        } else {
            winstonLogger.error(message, meta);
        }
    },

    debug: (message: string, meta: LogMeta = {}) => {
        winstonLogger.debug(message, meta);
    },
    requestLogger: ((req, res, next) => {
        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;
            const logMethod = res.statusCode >= 400 ? logger.warn : logger.debug;

            logMethod(`${req.method} ${req.originalUrl}`, {
                status: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip || req.connection.remoteAddress
            });
        });

        next();
    }) as RequestHandler
};

export default logger;
