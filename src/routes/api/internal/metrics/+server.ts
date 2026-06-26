/**
 * GET /api/internal/metrics?window=7
 *
 * Returns operational metrics for all restaurants the authenticated user has
 * access to. Scoped by the tenant context resolved from the session cookie.
 *
 * Query params:
 *   window  — rolling window in days (default 7, max 90)
 *
 * Auth: requires a valid session cookie (same auth as dashboard).
 * This endpoint is for internal dashboard use only — not a public API.
 *
 * Response shape: { metrics: Record<outletId, OutletMetrics>, windowDays: number }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';
import { getOrganizationMetrics } from '$lib/server/repositories/metrics-repository';
import { applyRateLimit } from '$lib/server/services/public-api-helpers';

const MAX_WINDOW_DAYS = 90;
const DEFAULT_WINDOW_DAYS = 7;

export const GET: RequestHandler = async ({ locals, url, request }) => {
	if (!locals.user) {
		error(401, 'Authentication required.');
	}

	// M3: rate limit authenticated metrics endpoint
	await applyRateLimit('metrics', request);

	const windowParam = url.searchParams.get('window');
	const windowDays = Math.min(
		MAX_WINDOW_DAYS,
		Math.max(1, Number(windowParam ?? DEFAULT_WINDOW_DAYS) || DEFAULT_WINDOW_DAYS)
	);

	const tenant = await resolveTenantContext(locals.user);
	// Use legacy restaurants array for backward compat — contains all outlets for this org.
	const outletIds = tenant.restaurants.map((r) => r.id);

	const metricsMap = await getOrganizationMetrics(outletIds, windowDays);

	const metrics: Record<string, unknown> = {};
	for (const [id, m] of metricsMap) {
		metrics[id] = m;
	}

	return json({ metrics, windowDays });
};
