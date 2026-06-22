import type { PageServerLoad } from './$types';
import { listTables } from '$lib/server/services/table-service';
import { appEnv } from '$lib/server/config/env';
import type { RestaurantTable } from '$lib/server/repositories/table-repository';

/**
 * Server load for the QR table manager page.
 *
 * Loads the active restaurant's tables from PostgreSQL. When the DB is
 * unavailable (USE_MOCK_BACKEND=true or DATABASE_URL unset), the load function
 * fails open with a 12-table mock list so the UI can still render the QR
 * cards for prototyping.
 */
export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();

	let tables: RestaurantTable[] = [];
	let useMockData = false;

	if (appEnv.databaseUrl && !appEnv.useMockBackend) {
		try {
			tables = await listTables(tenant.user, {
				restaurantSlug: tenant.activeRestaurant.slug
			});
		} catch (err) {
			if (appEnv.nodeEnv === 'production') {
				throw err;
			}
			console.warn('[tables] Could not load tables from DB:', err);
			tables = [];
			useMockData = true;
		}
	} else {
		useMockData = true;
	}

	if (useMockData && tables.length === 0) {
		// Local-development fallback: synthesise a 12-table list so the UI is
		// usable without infra. Mirrors the previous hard-coded behaviour.
		tables = Array.from({ length: 12 }, (_, index) => {
			const code = `T${String(index + 1).padStart(2, '0')}`;
			return {
				id: `mock-table-${code}`,
				organizationId: tenant.activeRestaurant.organizationId,
				restaurantId: tenant.activeRestaurant.id,
				code,
				label: code,
				isActive: true,
				qrPath: `/r/${tenant.activeRestaurant.slug}/table/${code}`
			};
		});
	}

	return { tenant, tables, useMockData };
};
