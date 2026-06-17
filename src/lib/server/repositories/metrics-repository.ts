/**
 * Metrics repository — real-time operational metrics from ai_events + feedback.
 *
 * All queries are scoped by restaurant_id and run as a direct pool query
 * (no user context needed — analytics reads are admin-tier, not guest-tier).
 *
 * The pool connects as `lingua_app`; the SELECT policies on ai_events and feedback
 * (defined in 0001) already scope by restaurant_id, so cross-tenant leakage is
 * impossible even if the caller passes an unscoped list.
 *
 * Design:
 *  - `getRestaurantMetrics` queries one restaurant for a rolling window.
 *  - `getOrganizationMetrics` fans out across all restaurants in an org.
 *  - Both return typed, non-nullable shapes so callers don't need null checks.
 */

import { query } from '$lib/server/db/postgres';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type RestaurantMetrics = {
	restaurantId: string;
	/** Rolling window in days used for the query. */
	windowDays: number;
	totalChats: number;
	/** 0–100 integer percentage of chats that returned 'ok' safety status. */
	helpfulRate: number;
	/** 0–100 integer percentage of chats that triggered needs-staff or blocked. */
	fallbackRate: number;
	/** 95th-percentile LLM latency in ms (null when no data). */
	latencyP95: number | null;
	/** Count of positive feedback responses in the window. */
	helpfulFeedback: number;
	/** Total feedback responses in the window. */
	totalFeedback: number;
};

type AiEventRow = {
	total_chats: string;
	ok_chats: string;
	fallback_chats: string;
	latency_p95: string | null;
};

type FeedbackRow = {
	helpful_count: string;
	total_count: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toInt(value: string | null | undefined): number {
	const n = Number(value ?? 0);
	return isNaN(n) ? 0 : Math.round(n);
}

function toPercent(numerator: number, denominator: number): number {
	if (denominator === 0) return 0;
	return Math.round((numerator / denominator) * 100);
}

// ---------------------------------------------------------------------------
// Core query
// ---------------------------------------------------------------------------

/**
 * Queries ai_events + feedback for a single restaurant over the last N days.
 * Uses PERCENTILE_CONT for P95 latency (requires at least one row with
 * non-null latency_ms).
 *
 * safetyFlags is a text[] column. We check for 'needs-staff' or 'blocked'
 * using the PostgreSQL && (array overlap) operator.
 */
async function fetchRestaurantMetrics(
	restaurantId: string,
	windowDays: number
): Promise<RestaurantMetrics> {
	const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

	// AI events query
	const aiResult = await query<AiEventRow>(
		`
			SELECT
				COUNT(*) FILTER (WHERE event_type = 'chat')::text AS total_chats,
				COUNT(*) FILTER (
					WHERE event_type = 'chat'
						AND NOT (safety_flags && ARRAY['needs-staff','blocked']::text[])
				)::text AS ok_chats,
				COUNT(*) FILTER (
					WHERE event_type = 'chat'
						AND (safety_flags && ARRAY['needs-staff','blocked']::text[])
				)::text AS fallback_chats,
				PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::text AS latency_p95
			FROM ai_events
			WHERE restaurant_id = $1::uuid
				AND created_at >= $2::timestamptz
		`,
		[restaurantId, since]
	);

	// Feedback query
	const fbResult = await query<FeedbackRow>(
		`
			SELECT
				COUNT(*) FILTER (WHERE helpful = true)::text AS helpful_count,
				COUNT(*)::text AS total_count
			FROM feedback
			WHERE restaurant_id = $1::uuid
				AND created_at >= $2::timestamptz
		`,
		[restaurantId, since]
	);

	const ai = aiResult.rows[0];
	const fb = fbResult.rows[0];

	const totalChats = toInt(ai?.total_chats);
	const okChats = toInt(ai?.ok_chats);
	const fallbackChats = toInt(ai?.fallback_chats);
	const helpfulFeedback = toInt(fb?.helpful_count);
	const totalFeedback = toInt(fb?.total_count);

	const latencyP95Raw = ai?.latency_p95;
	const latencyP95 = latencyP95Raw != null ? toInt(latencyP95Raw) : null;

	return {
		restaurantId,
		windowDays,
		totalChats,
		helpfulRate: toPercent(okChats, totalChats),
		fallbackRate: toPercent(fallbackChats, totalChats),
		latencyP95,
		helpfulFeedback,
		totalFeedback
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns metrics for a single restaurant. Fail-open: on DB error returns
 * zeroed metrics so the analytics page never crashes.
 */
export async function getRestaurantMetrics(
	restaurantId: string,
	windowDays = 7
): Promise<RestaurantMetrics> {
	try {
		return await fetchRestaurantMetrics(restaurantId, windowDays);
	} catch (err) {
		console.error('[metrics-repo] Failed to load restaurant metrics:', err);
		return {
			restaurantId,
			windowDays,
			totalChats: 0,
			helpfulRate: 0,
			fallbackRate: 0,
			latencyP95: null,
			helpfulFeedback: 0,
			totalFeedback: 0
		};
	}
}

/**
 * Fans out across all restaurant IDs in parallel.
 * Returns a map from restaurantId → RestaurantMetrics.
 */
export async function getOrganizationMetrics(
	restaurantIds: string[],
	windowDays = 7
): Promise<Map<string, RestaurantMetrics>> {
	const results = await Promise.all(
		restaurantIds.map((id) => getRestaurantMetrics(id, windowDays))
	);

	return new Map(results.map((m) => [m.restaurantId, m]));
}
