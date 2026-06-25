import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { resolvePublicCatalog } from '$lib/server/tenant/public-context';
import { findOrderById } from '$lib/server/repositories/order-repository';
import { withTransaction } from '$lib/server/db/postgres';

export const load: PageServerLoad = async ({ params }) => {
	const { slug, id } = params;

	const restaurant = await resolvePublicCatalog(slug);
	if (!restaurant) {
		throw error(404, 'Restaurant not found');
	}

	const order = await withTransaction(async (client) => {
		return findOrderById(client, {
			organizationId: restaurant.organizationId,
			restaurantId: restaurant.id,
			orderId: id
		});
	});

	if (!order) {
		throw error(404, 'Order not found');
	}

	return {
		restaurant,
		order
	};
};
