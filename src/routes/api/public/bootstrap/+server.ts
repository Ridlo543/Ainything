import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { resolvePublicMenu } from '$lib/server/tenant/public-context';
import { applyRateLimit } from '$lib/server/services/public-api-helpers';
import { cachePolicy } from '$lib/server/cache/cache-policy';

const bootstrapParamsSchema = z.object({
	outlet: z.string().min(1, 'Outlet slug is required.').max(120),
	table: z.string().min(1, 'Table code is required.').max(60)
});

/**
 * GET /api/public/bootstrap?outlet=<slug>&table=<code>
 *
 * Returns outlet profile + table metadata + full published catalog. Used by the PWA
 * on QR open and can be pre-fetched. Subsequent renders use the cached payload.
 *
 * Backward-compat: also accepts `restaurant` query param (legacy QR codes).
 *
 * Rate limit: 20 / 60 s per IP (bootstrap tier - higher than session-create because
 * CDN cache absorbs most real traffic; the limit guards against scraping).
 *
 * Cache strategy: PUBLIC_CATALOG - s-maxage=60, stale-while-revalidate=300.
 */
export const GET: RequestHandler = async ({ url, request }) => {
	await applyRateLimit('bootstrap', request);

	// Accept `outlet` (new) or `restaurant` (legacy QR codes already printed).
	const outletParam = url.searchParams.get('outlet')?.trim() ?? url.searchParams.get('restaurant')?.trim();

	const parseResult = bootstrapParamsSchema.safeParse({
		outlet: outletParam,
		table: url.searchParams.get('table')?.trim()
	});

	if (!parseResult.success) {
		error(400, 'Missing required query params: outlet and table.');
	}

	const { outlet: outletSlug, table: tableCode } = parseResult.data;

	const bootstrap = await resolvePublicMenu(outletSlug, tableCode);

	if (!bootstrap) {
		error(404, 'No published catalog found for this outlet and table.');
	}

	return json(bootstrap, { headers: cachePolicy.PUBLIC_CATALOG });
};
