import { getRestaurant } from '$lib/mock/restaurants';
import type { PublicMenuBootstrap } from '$lib/domain/menu/types';
import { appEnv } from '$lib/server/config/env';
import { resolvePublicMenuBootstrap } from '$lib/server/repositories/public-menu-repository';

/**
 * Resolves the public QR bootstrap (active restaurant + active table + published menu).
 *
 * Mirrors the dashboard tenant resolver: use PostgreSQL when configured, fall back to
 * mock data only outside production so local frontend work keeps running without a DB.
 * Returns `null` when the slug/table pair does not resolve to publishable data.
 */
export async function resolvePublicMenu(
	restaurantSlug: string,
	tableCode: string
): Promise<PublicMenuBootstrap | null> {
	if (!appEnv.databaseUrl || appEnv.useMockBackend) {
		return resolveMockPublicMenu(restaurantSlug, tableCode);
	}

	try {
		return await resolvePublicMenuBootstrap(restaurantSlug, tableCode);
	} catch (error) {
		if (appEnv.nodeEnv === 'production') {
			throw error;
		}

		console.warn('Falling back to mock public menu because database resolution failed.', error);
		return resolveMockPublicMenu(restaurantSlug, tableCode);
	}
}

function resolveMockPublicMenu(
	restaurantSlug: string,
	tableCode: string
): PublicMenuBootstrap | null {
	const restaurant = getRestaurant(restaurantSlug);

	if (!restaurant) {
		return null;
	}

	return {
		restaurant,
		table: {
			id: `${restaurant.id}-${tableCode}`,
			code: tableCode,
			label: tableCode,
			restaurantId: restaurant.id,
			organizationId: restaurant.organizationId
		}
	};
}
