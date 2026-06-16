/**
 * Per-restaurant daily AI-call cap.
 *
 * Design decisions (mirrors rate-limiter.ts):
 * - Redis fixed-window keyed by restaurant id + UTC date.
 * - Fail-open: if Redis is down, allow the request to avoid guest outage.
 * - Cap value is configurable via env (AI_DAILY_CAP, default 500 calls/restaurant/day).
 *   Tune during pilot based on observed volume and LLM cost data.
 * - The cap is enforced before calling the LLM so we never pay for a request we won't
 *   return an answer for.
 *
 * Per Technical_Specification.md "Public Endpoint Abuse and Cost Controls":
 * When exceeded, the chat endpoint must return a graceful "ask staff" fallback instead
 * of an error.
 */

import { getRedisClient } from '$lib/server/cache/redis';
import { appEnv } from '$lib/server/config/env';

const INCREMENT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

/** Returns the current UTC date as YYYY-MM-DD for a stable daily window key. */
function utcDateKey(): string {
	return new Date().toISOString().slice(0, 10);
}

export type AiCapResult = { allowed: true; count: number } | { allowed: false; count: number };

/**
 * Checks and increments the daily AI-call counter for a restaurant.
 *
 * @param restaurantId - the restaurant's UUID (server-derived, never from the body)
 */
export async function checkDailyAiCap(restaurantId: string): Promise<AiCapResult> {
	if (appEnv.nodeEnv === 'test') {
		return { allowed: true, count: 0 };
	}

	const cap = Number(appEnv.aiDailyCap ?? 500);
	const redisKey = `ai-cap:${restaurantId}:${utcDateKey()}`;
	// Window = seconds remaining in the UTC day.
	const secondsUntilMidnight = 86400 - (Math.floor(Date.now() / 1000) % 86400);

	try {
		const redis = await getRedisClient();

		const count = (await redis.eval(INCREMENT_LUA, {
			keys: [redisKey],
			arguments: [String(secondsUntilMidnight)]
		})) as number;

		if (count > cap) {
			return { allowed: false, count };
		}

		return { allowed: true, count };
	} catch (err) {
		console.error('[ai-cost-cap] Redis error — allowing request (fail-open)', err);
		return { allowed: true, count: 0 };
	}
}
