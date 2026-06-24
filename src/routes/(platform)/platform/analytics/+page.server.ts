import type { PageServerLoad } from './$types';
import { getPlatformAnalytics } from '$lib/server/services/platform-admin-service';
import { appEnv } from '$lib/server/config/env';

export const load: PageServerLoad = async ({ url }) => {
	const windowDays = Math.min(Math.max(Number(url.searchParams.get('days') ?? '30'), 7), 90);

	let analytics = null;
	if (appEnv.databaseUrl) {
		try {
			analytics = await getPlatformAnalytics(windowDays);
		} catch (err) {
			console.error('[platform/analytics] load error:', err);
		}
	}

	return {
		analytics,
		windowDays
	};
};
