import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolvePublicMenu } from '$lib/server/tenant/public-context';
import { hostMatchesRestaurant } from '$lib/server/tenant/host-resolver';

/**
 * Server load for the public QR guest experience.
 *
 * Two URL strategies for MVP:
 *   1. Path-based:  /r/<slug>/table/<code>     (default in dev/test)
 *   2. Host-based:  <slug>.linguaserve.app/table/<code>   (production)
 *
 * For both, the slug always comes from the path. The host header is
 * validated AFTER resolution to prevent cross-tenant impersonation:
 * if a guest arrives at a custom host (e.g. uma-karang.linguaserve.app)
 * with a path that doesn't match the host's tenant, we 404.
 */
export const load: PageServerLoad = async ({ params, request }) => {
	const bootstrap = await resolvePublicMenu(params.restaurantSlug, params.tableCode);

	if (!bootstrap) {
		error(404, 'Menu not found for this restaurant and table.');
	}

	// Host consistency check: if the request arrived on a custom host
	// (i.e. not localhost/127.0.0.1), the host must match the resolved
	// restaurant's public_host column. This is a defense against Host
	// header spoofing — an attacker who controls the path can't read
	// data from a tenant they don't own.
	const hostHeader = request.headers.get('host');
	const isLocalhost = hostHeader
		? /^localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$|^\[::1\](:\d+)?$/.test(hostHeader)
		: false;

	if (!isLocalhost && bootstrap.restaurant.publicHost) {
		if (!hostMatchesRestaurant(hostHeader, bootstrap.restaurant.publicHost)) {
			error(404, 'Menu not found for this restaurant and table.');
		}
	}

	return {
		restaurant: bootstrap.restaurant,
		table: bootstrap.table,
		tableCode: bootstrap.table.code
	};
};
