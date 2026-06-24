import type { PageServerLoad } from './$types';
import { listRequests } from '$lib/server/services/staff-inbox-service';
import { appEnv } from '$lib/server/config/env';

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();

	// Load the latest 5 open requests for the dashboard snapshot.
	// Fail-open: an empty array is returned when DB is unavailable.
	let recentRequests: import('$lib/domain/fallback/types').StaffRequest[] = [];

	if (appEnv.databaseUrl && !appEnv.useMockBackend) {
		try {
			const restaurantIds = tenant.restaurants.map((r) => r.id);
			const all = await listRequests(tenant.user.id, tenant.organization.id, restaurantIds);
			// Show only open (new / in-progress) requests on the overview
			recentRequests = all
				.filter((r) => r.status === 'new' || r.status === 'in-progress')
				.slice(0, 5);
		} catch (err) {
			console.error('[dashboard] Failed to load staff requests:', err);
		}
	}

	return { recentRequests };
};
