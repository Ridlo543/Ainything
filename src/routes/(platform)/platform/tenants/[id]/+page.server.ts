import type { PageServerLoad } from './$types';
import { getOrganizationByIdRow, listRestaurantsRows } from '$lib/server/repositories/platform-repository';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const org = await getOrganizationByIdRow(params.id);

	if (!org) {
		throw error(404, 'Organization not found');
	}

	const restaurants = await listRestaurantsRows({
		limit: 50,
		offset: 0,
		organizationId: params.id
	});

	return {
		org,
		restaurants
	};
};
