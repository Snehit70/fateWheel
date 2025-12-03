const logger = {
    info: (message, meta = {}) => {
        console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...meta }));
    },
    error: (message, error = null, meta = {}) => {
        console.error(JSON.stringify({
            level: 'error',
            message,
            error: error ? (error.message || error) : undefined,
            stack: error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            ...meta
        }));
    },
    warn: (message, meta = {}) => {
        console.warn(JSON.stringify({ level: 'warn', message, timestamp: new Date().toISOString(), ...meta }));
    }
};

module.exports = logger;
