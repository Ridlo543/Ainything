/**
 * Service for restaurant-table lookups.
 *
 * Tables are read-only on the admin side for now — the seed/migration owns
 * the table data and a future "table manager" CRUD feature can extend this
 * service with create/update/delete operations. Today this service only
 * resolves tenant context and returns the active restaurant's table list.
 */

import type { AuthUser } from '$lib/domain/auth/types';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';
import { listActiveTablesForRestaurant } from '$lib/server/repositories/table-repository';
import type { RestaurantTable } from '$lib/server/repositories/table-repository';

/**
 * Returns the active restaurant's tables. Falls back to an empty list when
 * the database is unavailable (the route layer wraps this in fail-open and
 * shows mock data via the `useMockData` flag).
 */
export async function listTables(
	user: AuthUser,
	{ restaurantSlug }: { restaurantSlug: string }
): Promise<RestaurantTable[]> {
	const tenant = await resolveTenantContext(user, restaurantSlug);
	return listActiveTablesForRestaurant(tenant.activeRestaurant.id);
}
