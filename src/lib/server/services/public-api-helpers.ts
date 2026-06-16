/**
 * Shared helpers for public API route handlers.
 *
 * - `getRateLimitKey`: derives a stable, privacy-safe key for the rate limiter from
 *   the request (session token from header, with IP as fallback).
 * - `applyRateLimit`: checks the limit and throws a 429 SvelteKit error if exceeded.
 */

import { error } from '@sveltejs/kit';
import { checkRateLimit, type RateLimitEndpoint } from '$lib/server/services/rate-limiter';

/**
 * Returns a rate-limit key for the request.
 *
 * Priority:
 * 1. `X-Session-Token` request header (issued by the server on session create, stored
 *    client-side; ties limits to a logical guest session).
 * 2. `X-Forwarded-For` first IP (set by CDN/proxy in production).
 * 3. Literal `'unknown'` (fail-open — better to allow than to crash).
 *
 * Keys are hashed at the Redis layer via the prefix so raw IPs are never stored as
 * top-level Redis keys.
 */
export function getRateLimitKey(request: Request): string {
	const sessionToken = request.headers.get('x-session-token');

	if (sessionToken) {
		return `tok:${sessionToken.slice(0, 64)}`;
	}

	const forwarded = request.headers.get('x-forwarded-for');
	const ip = forwarded ? forwarded.split(',')[0].trim() : null;

	return ip ? `ip:${ip}` : 'unknown';
}

/**
 * Checks the rate limit and throws `429` if exceeded.
 * Call this at the top of every public endpoint handler.
 */
export async function applyRateLimit(endpoint: RateLimitEndpoint, request: Request): Promise<void> {
	const key = getRateLimitKey(request);
	const result = await checkRateLimit(endpoint, key);

	if (!result.allowed) {
		error(429, `Rate limit reached. Retry after ${result.retryAfterSec}s.`);
	}
}
