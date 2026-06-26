/**
 * Metrics repository — real-time operational metrics from ai_events + feedback.
 *
 * All queries are scoped by restaurant_id and run as a direct pool query
 * (no user context needed — analytics reads are admin-tier, not guest-tier).
 *
 * The pool connects as `ainything_app`; the SELECT policies on ai_events and feedback
 * (defined in 0001) already scope by restaurant_id, so cross-tenant leakage is
 * impossible even if the caller passes an unscoped list.
 *
 * Design:
 *  - `getRestaurantMetrics` queries one restaurant for a rolling window.
 *  - `getOrganizationMetrics` fans out across all restaurants in an org.
 *  - Both return typed, non-nullable shapes so callers don't need null checks.
 */

import { query } from '$lib/server/db/postgres';
import type { OutletMetrics } from '$lib/domain/analytics/types';
export type { OutletMetrics };

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
async function fetchOutletMetrics(
	outletId: string,
	windowDays: number
): Promise<OutletMetrics> {
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
		[outletId, since]
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
		[outletId, since]
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
		outletId,
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
export async function getOutletMetrics(
	outletId: string,
	windowDays = 7
): Promise<OutletMetrics> {
	try {
		return await fetchOutletMetrics(outletId, windowDays);
	} catch (err) {
		console.error('[metrics-repo] Failed to load outlet metrics:', err);
		return {
			outletId,
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
 * Fans out across all outlet IDs in parallel.
 * Returns a map from outletId → OutletMetrics.
 */
export async function getOrganizationMetrics(
	outletIds: string[],
	windowDays = 7
): Promise<Map<string, OutletMetrics>> {
	const results = await Promise.all(
		outletIds.map((id) => getOutletMetrics(id, windowDays))
	);

	return new Map(results.map((m: OutletMetrics) => [m.outletId, m]));
}
