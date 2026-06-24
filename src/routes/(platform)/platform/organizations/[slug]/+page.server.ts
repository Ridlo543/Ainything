import { error, fail } from '@sveltejs/kit';
import {
	getOrganizationDetail,
	listRestaurants,
	PlatformAdminInputError,
	PlatformAdminNotFoundError,
	setOrganizationStatus
} from '$lib/server/services/platform-admin-service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const [organization, restaurants] = await Promise.all([
			getOrganizationDetail(params.slug),
			listRestaurants({ organizationId: undefined, limit: 50, offset: 0 })
		]);
		// Filter restaurants client-side after load to keep the query lean.
		const orgRestaurants = restaurants.filter((r) => r.organizationName === organization.name);
		return { organization, restaurants: orgRestaurants };
	} catch (err) {
		if (err instanceof PlatformAdminNotFoundError) throw error(404, err.message);
		if (err instanceof PlatformAdminInputError) throw error(400, err.message);
		console.warn('[platform org detail] Failed to load', err);
		throw error(500, 'Could not load organization.');
	}
};

export const actions: Actions = {
	setStatus: async ({ request }) => {
		const formData = await request.formData();
		const status = formData.get('status') as string;
		const organizationId = formData.get('organizationId') as string;

		if (!organizationId || !status) {
			return fail(400, { error: 'Missing organizationId or status.' });
		}

		try {
			await setOrganizationStatus(organizationId, status as 'active' | 'paused' | 'archived');
			return { success: true, status };
		} catch (err) {
			if (err instanceof PlatformAdminInputError) return fail(400, { error: err.message });
			console.warn('[platform org detail] setStatus failed', err);
			return fail(500, { error: 'Could not update status.' });
		}
	}
};
