import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolvePublicMenu } from '$lib/server/tenant/public-context';
import { applyRateLimit } from '$lib/server/services/public-api-helpers';

/**
 * GET /api/public/bootstrap?restaurant=<slug>&table=<code>
 *
 * Returns restaurant profile + table metadata + full published menu. Used by the PWA
 * on QR open and can be pre-fetched. Subsequent renders use the cached payload.
 *
 * Rate limit: 20 / 60 s per IP (bootstrap tier — higher than session-create because
 * CDN cache absorbs most real traffic; the limit guards against scraping).
 *
 * Cache strategy:
 * - s-maxage=60: shared/CDN cache holds for 60 s.
 * - stale-while-revalidate=300: CDN serves stale while revalidating for 5 min.
 */
export const GET: RequestHandler = async ({ url, request }) => {
	await applyRateLimit('bootstrap', request);

	const restaurantSlug = url.searchParams.get('restaurant')?.trim();
	const tableCode = url.searchParams.get('table')?.trim();

	if (!restaurantSlug || !tableCode) {
		error(400, 'Missing required query params: restaurant and table.');
	}

	const bootstrap = await resolvePublicMenu(restaurantSlug, tableCode);

	if (!bootstrap) {
		error(404, 'No published menu found for this restaurant and table.');
	}

	return json(bootstrap, {
		headers: {
			'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
			Vary: 'Accept-Language'
		}
	});
};
