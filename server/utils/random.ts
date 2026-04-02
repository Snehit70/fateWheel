import crypto from 'crypto';

/**
 * Securely generates a random integer between min (inclusive) and max (exclusive).
 */
export function secureRandomInt(min: number, max: number): number {
    const range = max - min;
    if (!Number.isInteger(min) || !Number.isInteger(max) || range <= 0) {
        throw new Error('secureRandomInt requires integer bounds with max > min');
    }

    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxBytes = 256 ** bytesNeeded;
    const keep = maxBytes - (maxBytes % range);

    while (true) {
        const buffer = crypto.randomBytes(bytesNeeded);
        let value = 0;
        for (let index = 0; index < bytesNeeded; index += 1) {
            value = (value << 8) + buffer[index];
        }
        if (value < keep) {
            return min + (value % range);
        }
    }
}
