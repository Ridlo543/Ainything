import type { PageServerLoad } from './$types';
import {
	getOrganizationMetrics,
	type RestaurantMetrics
} from '$lib/server/repositories/metrics-repository';
import { appEnv } from '$lib/server/config/env';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { tenant } = await parent();

	const windowParam = url.searchParams.get('window');
	const windowDays = Math.min(90, Math.max(1, Number(windowParam ?? 7) || 7));

	// Only query DB when database is available — fall back to mock analytics otherwise.
	let metrics: Map<string, RestaurantMetrics> | null = null;

	if (appEnv.databaseUrl && !appEnv.useMockBackend) {
		const restaurantIds = tenant.restaurants.map((r) => r.id);
		// getOrganizationMetrics is fail-open — it never throws.
		metrics = await getOrganizationMetrics(restaurantIds, windowDays);
	}

	return { metrics: metrics ? Object.fromEntries(metrics) : null, windowDays };
};
