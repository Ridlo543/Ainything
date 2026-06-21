/**
 * Re-exports from domain layer — the canonical source lives at
 * `$lib/domain/sanitize.ts`. This file is kept for backward compatibility
 * with any code already importing from here.
 */
export { sanitizeText, createSanitizePipe, sanitizePipe } from '$lib/domain/sanitize';