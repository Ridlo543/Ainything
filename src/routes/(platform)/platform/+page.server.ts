import { error } from '@sveltejs/kit';
import {
	getPlatformStats,
	PlatformAdminInputError
} from '$lib/server/services/platform-admin-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const stats = await getPlatformStats();
		return { stats };
	} catch (err) {
		if (err instanceof PlatformAdminInputError) {
			throw error(400, err.message);
		}
		console.warn('[platform overview] Could not load platform stats', err);
		throw error(500, 'Could not load platform stats.');
	}
};
