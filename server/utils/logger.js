const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    };
};

const safeStringify = (obj) => {
    try {
        return JSON.stringify(obj, getCircularReplacer());
    } catch (err) {
        return JSON.stringify({ level: 'error', message: 'Logger failed to stringify message', error: err.message });
    }
};

const logger = {
    info: (message, meta = {}) => {
        console.log(safeStringify({ level: 'info', message, timestamp: new Date().toISOString(), ...meta }));
    },
    error: (message, error = null, meta = {}) => {
        console.error(safeStringify({
            level: 'error',
            message,
            error: error ? (error.message || error) : undefined,
            stack: error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            ...meta
        }));
    },
    warn: (message, meta = {}) => {
        console.warn(safeStringify({ level: 'warn', message, timestamp: new Date().toISOString(), ...meta }));
    }
};

module.exports = logger;
