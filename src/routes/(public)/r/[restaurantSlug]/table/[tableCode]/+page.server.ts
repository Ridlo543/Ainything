import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolvePublicMenu } from '$lib/server/tenant/public-context';

export const load: PageServerLoad = async ({ params }) => {
	const bootstrap = await resolvePublicMenu(params.restaurantSlug, params.tableCode);

	if (!bootstrap) {
		error(404, 'Menu not found for this restaurant and table.');
	}

	return {
		restaurant: bootstrap.restaurant,
		table: bootstrap.table,
		tableCode: bootstrap.table.code
	};
};
