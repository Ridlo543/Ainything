import { memberships, organizations, restaurants } from '$lib/mock/restaurants';
import type { AppUser, TenantContext } from '$lib/domain/menu/types';
import { appEnv } from '$lib/server/config/env';
import { resolveTenantContextFromDatabase } from '$lib/server/repositories/tenant-repository';

export async function resolveTenantContext(
	user: AppUser,
	selectedRestaurantSlug?: string
): Promise<TenantContext> {
	if (!appEnv.databaseUrl || appEnv.useMockBackend) {
		return resolveMockTenantContext(user, selectedRestaurantSlug);
	}

	try {
		return await resolveTenantContextFromDatabase(user, selectedRestaurantSlug);
	} catch (error) {
		if (appEnv.nodeEnv === 'production') {
			throw error;
		}

		console.warn('Falling back to mock tenant context because database resolution failed.', error);
		return resolveMockTenantContext(user, selectedRestaurantSlug);
	}
}

export function resolveMockTenantContext(
	user: AppUser,
	selectedRestaurantSlug?: string
): TenantContext {
	const membership =
		memberships.find(
			(item) => item.userId === user.id && item.organizationId === user.defaultOrganizationId
		) ?? memberships.find((item) => item.userId === user.id);

	if (!membership) {
		throw new Error(`No membership found for user ${user.id}`);
	}

	const organization = organizations.find((item) => item.id === membership.organizationId);
	if (!organization) {
		throw new Error(`No organization found for membership ${membership.id}`);
	}

	const scopedRestaurants = restaurants.filter((restaurant) =>
		membership.restaurantIds.includes(restaurant.id)
	);

	if (scopedRestaurants.length === 0) {
		throw new Error(`No restaurants available for membership ${membership.id}`);
	}

	const activeRestaurant =
		scopedRestaurants.find((restaurant) => restaurant.slug === selectedRestaurantSlug) ??
		scopedRestaurants[0];

	return {
		user,
		membership,
		organization,
		restaurants: scopedRestaurants,
		activeRestaurant
	};
}
