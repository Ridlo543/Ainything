import { error, fail } from '@sveltejs/kit';
import {
	getRestaurantDetail,
	PlatformAdminInputError,
	PlatformAdminNotFoundError,
	setRestaurantStatus
} from '$lib/server/services/platform-admin-service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const restaurant = await getRestaurantDetail(params.slug);
		return { restaurant };
	} catch (err) {
		if (err instanceof PlatformAdminNotFoundError) throw error(404, err.message);
		if (err instanceof PlatformAdminInputError) throw error(400, err.message);
		console.warn('[platform restaurant detail] Failed to load', err);
		throw error(500, 'Could not load restaurant.');
	}
};

export const actions: Actions = {
	setStatus: async ({ request }) => {
		const formData = await request.formData();
		const status = formData.get('status') as string;
		const restaurantId = formData.get('restaurantId') as string;

		if (!restaurantId || !status) {
			return fail(400, { error: 'Missing restaurantId or status.' });
		}

		try {
			await setRestaurantStatus(restaurantId, status as 'active' | 'paused' | 'archived');
			return { success: true, status };
		} catch (err) {
			if (err instanceof PlatformAdminInputError) return fail(400, { error: err.message });
			console.warn('[platform restaurant detail] setStatus failed', err);
			return fail(500, { error: 'Could not update status.' });
		}
	}
};
