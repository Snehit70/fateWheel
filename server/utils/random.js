const crypto = require('crypto');

/**
 * Securely generates a random integer between min (inclusive) and max (exclusive).
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function secureRandomInt(min, max) {
    const range = max - min;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxBytes = Math.pow(256, bytesNeeded);
    const keep = maxBytes - (maxBytes % range);

    while (true) {
        const buffer = crypto.randomBytes(bytesNeeded);
        let value = 0;
        for (let i = 0; i < bytesNeeded; i++) {
            value = (value << 8) + buffer[i];
        }
        if (value < keep) {
            return min + (value % range);
        }
    }
}

module.exports = { secureRandomInt };
