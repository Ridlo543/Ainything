/**
 * Redis-backed fixed-window rate limiter for public anonymous endpoints.
 *
 * Design decisions:
 * - Atomic Lua script so increment + EXPIRE is a single round-trip and race-free.
 * - Fail-open: if Redis is unreachable, the request is allowed. A Redis outage must
 *   not break the tourist QR flow; cost exposure from a brief window is lower risk than
 *   a hard outage for guests.
 * - Keys are namespaced per endpoint identifier so limits are independently tunable.
 * - TTL matches the window (fixed-window, not sliding). Good enough for MVP abuse
 *   prevention; replace with a sliding-log or token-bucket if pilot data shows abuse.
 *
 * Limits (per Technical_Specification.md "Public Endpoint Abuse and Cost Controls"):
 *   session-create:  5  / 60 s  per IP
 *   chat:           20  / 60 s  per session token
 *   fallback:        5  / 60 s  per session token
 *   feedback:       10  / 60 s  per session token
 */

import { getRedisClient } from '$lib/server/cache/redis';
import { appEnv } from '$lib/server/config/env';

export type RateLimitEndpoint =
	| 'session-create'
	| 'chat'
	| 'fallback'
	| 'feedback'
	| 'bootstrap'
	| 'slug-check'
	| 'password-reset'
	| 'embeddings'
	| 'vitals'
	| 'metrics';

const LIMITS: Record<RateLimitEndpoint, { max: number; windowSec: number }> = {
	'session-create': { max: 5, windowSec: 60 },
	chat: { max: 20, windowSec: 60 },
	fallback: { max: 5, windowSec: 60 },
	feedback: { max: 10, windowSec: 60 },
	bootstrap: { max: 30, windowSec: 60 },
	'slug-check': { max: 30, windowSec: 60 },
	// Authenticated endpoints — still rate-limited to prevent abuse
	'password-reset': { max: 5, windowSec: 300 }, // 5 per 5 min per IP
	'embeddings': { max: 10, windowSec: 60 }, // 10 per min per user
	'vitals': { max: 60, windowSec: 60 }, // 60 batches per min per IP
	'metrics': { max: 60, windowSec: 60 } // 60 req per min per authenticated user
};

// Lua: atomic increment + set expiry only on first hit (so the window starts at first
// request, not each request).
const INCREMENT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

/**
 * Checks and increments the rate-limit counter for the given endpoint and key.
 *
 * @param endpoint  - one of the defined limit tiers
 * @param key       - distinguishing value (IP address or session token)
 * @returns         - `{ allowed: true }` or `{ allowed: false, retryAfterSec }`
 */
export async function checkRateLimit(
	endpoint: RateLimitEndpoint,
	key: string
): Promise<RateLimitResult> {
	// Rate limiting is skipped in test environments to keep unit tests clean.
	if (appEnv.nodeEnv === 'test') {
		return { allowed: true };
	}

	const { max, windowSec } = LIMITS[endpoint];
	const redisKey = `rl:${endpoint}:${key}`;

	try {
		const redis = await getRedisClient();

		const count = (await redis.eval(INCREMENT_LUA, {
			keys: [redisKey],
			arguments: [String(windowSec)]
		})) as number;

		if (count > max) {
			return { allowed: false, retryAfterSec: windowSec };
		}

		return { allowed: true };
	} catch (err) {
		// Fail-open: log the error but allow the request.
		console.error('[rate-limiter] Redis error — allowing request (fail-open)', err);
		return { allowed: true };
	}
}

/**
 * Returns a plain-English description of the active limits. Used in API documentation
 * comments and can be surfaced in error responses.
 */
export function rateLimitDescription(endpoint: RateLimitEndpoint): string {
	const { max, windowSec } = LIMITS[endpoint];
	return `${max} requests per ${windowSec}s`;
}
