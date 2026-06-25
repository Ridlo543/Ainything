import type { PageServerLoad } from './$types';
import { getPlatformStatsRow, getPlatformAnalyticsRow, listOrganizationsRows } from '$lib/server/repositories/platform-repository';

export const load: PageServerLoad = async () => {
	const [stats, analytics, recentOrgs] = await Promise.all([
		getPlatformStatsRow(),
		getPlatformAnalyticsRow(30),
		listOrganizationsRows({ limit: 5, offset: 0 })
	]);

	return {
		stats,
		analytics,
		recentOrgs
	};
};
