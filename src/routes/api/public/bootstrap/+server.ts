import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolvePublicMenu } from '$lib/server/tenant/public-context';

/**
 * GET /api/public/bootstrap?restaurant=<slug>&table=<code>
 *
 * Returns restaurant profile + table metadata + full published menu. Used by the PWA
 * on QR open and can be pre-fetched. Subsequent renders use the cached payload.
 *
 * Cache strategy:
 * - s-maxage=60: shared/CDN cache holds for 60 s (published menu changes infrequently).
 * - stale-while-revalidate=300: CDN serves stale while revalidating for 5 min.
 * - Private/draft data is never served here; the restaurant+menu query in the repository
 *   only returns published menus and active restaurants/tables.
 *
 * No authentication required. Rate limiting is light because cache hit rate is high.
 */
export const GET: RequestHandler = async ({ url }) => {
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
