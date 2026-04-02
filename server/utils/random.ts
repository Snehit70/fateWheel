import crypto from 'crypto';

/**
 * Securely generates a random integer between min (inclusive) and max (exclusive).
 */
export function secureRandomInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max <= min) {
    throw new Error('secureRandomInt requires integer bounds with max > min');
  }

  return crypto.randomInt(min, max);
}
