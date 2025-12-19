const winston = require('winston');

const winstonLogger = winston.createLogger({
    level: 'info',
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
                    info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack ? '\n' + info.stack : ''} ${Object.keys(info).length > 3 ? JSON.stringify(Object.assign({}, info, { level: undefined, message: undefined, timestamp: undefined, stack: undefined })) : ''}`
                )
            )
        })
    ]
});

const logger = {
    info: (message, meta = {}) => {
        winstonLogger.info(message, meta);
    },
    warn: (message, meta = {}) => {
        winstonLogger.warn(message, meta);
    },
    error: (message, error = null, meta = {}) => {
        if (error instanceof Error) {
            winstonLogger.error(message, { ...meta, error: error.message, stack: error.stack });
        } else if (error) {
            winstonLogger.error(message, { ...meta, error: error });
        } else {
            winstonLogger.error(message, meta);
        }
    }
};

module.exports = logger;
