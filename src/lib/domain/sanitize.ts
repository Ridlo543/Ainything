import { z } from 'zod';

const CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const MULTISPACE_RE = /[ \t]+/g;
const CONSECUTIVE_NEWLINE_RE = /\n{3,}/g;

/**
 * Sanitizes user-provided free-text input:
 * - Trims leading/trailing whitespace
 * - Removes ASCII control characters (except \n and \t)
 * - Collapses multiple spaces/tabs into one
 * - Collapses >2 consecutive newlines to 2
 * - Truncates to `maxLength` (optional, default 10000)
 */
export function sanitizeText(input: string, maxLength = 10_000): string {
	return input
		.trim()
		.replace(CONTROL_RE, '')
		.replace(MULTISPACE_RE, ' ')
		.replace(CONSECUTIVE_NEWLINE_RE, '\n\n')
		.slice(0, maxLength);
}

/**
 * Zod helper: `.pipe(z.string().transform(sanitizeText))` equivalent.
 * Returns a ZodString with built-in sanitization and clamping.
 *
 * Usage: `z.string().pipe(sanitizePipe)`
 * or with a custom max: `z.string().pipe(createSanitizePipe(500))`
 */
export function createSanitizePipe(maxLength = 10_000) {
	return z.string().transform((val) => sanitizeText(val, maxLength));
}

export const sanitizePipe = createSanitizePipe();
