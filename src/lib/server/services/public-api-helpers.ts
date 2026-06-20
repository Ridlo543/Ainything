/**
 * Shared helpers for public API route handlers.
 *
 * - `getRateLimitKey`: derives a stable, privacy-safe key for the rate limiter from
 *   the request (session token from header, with IP as fallback).
 * - `applyRateLimit`: checks the limit and throws a 429 SvelteKit error if exceeded.
 * - `checkBodySize`: validates Content-Length before body parsing (413 if too large).
 */

import { error } from '@sveltejs/kit';
import { checkRateLimit, type RateLimitEndpoint } from '$lib/server/services/rate-limiter';

const DEFAULT_MAX_BODY_BYTES = 512_000;

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

/**
 * Validates the Content-Length header before the route handler parses the body.
 * SvelteKit's BODY_SIZE_LIMIT is a hard cap at the framework level; this check
 * provides an earlier, more descriptive rejection (413) that matches the API
 * contract without waiting for the full body to be read.
 *
 * @param maxBytes - max allowed body size in bytes (default 512 KB)
 */
export function checkBodySize(request: Request, maxBytes = DEFAULT_MAX_BODY_BYTES): void {
	const contentLength = request.headers.get('content-length');

	if (contentLength) {
		const len = Number(contentLength);
		if (Number.isFinite(len) && len > maxBytes) {
			error(413, `Request body too large. Max ${maxBytes} bytes.`);
		}
	}
}
