/**
 * POST /api/internal/vitals
 *
 * Receives a batch of Core Web Vitals entries from the browser and persists
 * them to the `web_vitals` table for performance monitoring.
 *
 * This endpoint is intentionally unauthenticated — Web Vitals are non-sensitive
 * performance measurements and the request originates from the user's own browser.
 * Rate-limiting and origin checks are handled at the infrastructure layer.
 *
 * Request body: Array of VitalsPayloadEntry (max 50 entries per batch).
 * Response: 204 No Content on success.
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { insertWebVitals, type VitalsInsert } from '$lib/server/repositories/web-vitals-repository';
import { appEnv } from '$lib/server/config/env';
import { applyRateLimit } from '$lib/server/services/public-api-helpers';

const METRIC_NAMES = new Set(['LCP', 'FID', 'INP', 'CLS', 'TTFB']);
const RATINGS = new Set(['good', 'needs-improvement', 'poor']);
const MAX_BATCH = 50;

type VitalsPayloadEntry = {
	name: string;
	value: number;
	rating: string;
	path: string;
	restaurantId?: string | null;
};

function isValidEntry(e: unknown): e is VitalsPayloadEntry {
	if (!e || typeof e !== 'object') return false;
	const entry = e as Record<string, unknown>;
	return (
		typeof entry.name === 'string' &&
		METRIC_NAMES.has(entry.name) &&
		typeof entry.value === 'number' &&
		isFinite(entry.value) &&
		typeof entry.rating === 'string' &&
		RATINGS.has(entry.rating) &&
		typeof entry.path === 'string'
	);
}

export const POST: RequestHandler = async ({ request }) => {
	// Rate-limit: 60 batches per minute per IP (Web Vitals are sent on page unload)
	await applyRateLimit('vitals', request);

	// Skip DB write if no database is configured or mock backend is active.
	if (!appEnv.databaseUrl || appEnv.useMockBackend) {
		return new Response(null, { status: 204 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	if (!Array.isArray(body)) {
		error(400, 'Body must be an array of vitals entries');
	}

	const entries = (body as unknown[])
		.slice(0, MAX_BATCH)
		.filter(isValidEntry)
		.map(
			(e): VitalsInsert => ({
				restaurantId: e.restaurantId ?? null,
				name: e.name as VitalsInsert['name'],
				value: Math.round(e.value * 100) / 100,
				rating: e.rating as VitalsInsert['rating'],
				path: e.path.slice(0, 500)
			})
		);

	if (entries.length === 0) {
		return new Response(null, { status: 204 });
	}

	try {
		await insertWebVitals(entries);
	} catch {
		// Fail-open silently: web_vitals table may not exist in dev/staging
	}

	return new Response(null, { status: 204 });
};

// Preflight for fetch-based beacons from same-site subdomains.
// We restrict the origin to the app's own host rather than '*' to avoid
// accepting vitals payloads from arbitrary third-party pages.
export const OPTIONS: RequestHandler = ({ request }) => {
	const origin = request.headers.get('origin') ?? '';
	const allowed = appEnv.publicAppUrl
		? origin === appEnv.publicAppUrl || origin.endsWith('.' + new URL(appEnv.publicAppUrl).host)
		: true; // allow all origins in dev (no PUBLIC_APP_URL set)
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': allowed ? origin : '',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			Vary: 'Origin'
		}
	});
};
