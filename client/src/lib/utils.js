import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes with conflict resolution.
 * Combines clsx for conditional class handling with tailwind-merge
 * for proper Tailwind class deduplication.
 * 
 * @param {...(string|object|array)} inputs - Class names, objects, or arrays
 * @returns {string} Merged class string
 * @example
 * cn('px-2', 'px-4') // returns 'px-4' (resolves conflict)
 * cn('text-red-500', condition && 'text-blue-500')
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
