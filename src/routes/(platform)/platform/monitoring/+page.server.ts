import type { PageServerLoad } from './$types';
import { getPlatformAnalyticsRow } from '$lib/server/repositories/platform-repository';

export const load: PageServerLoad = async () => {
	const analytics = await getPlatformAnalyticsRow(30);

	return {
		analytics
	};
};
