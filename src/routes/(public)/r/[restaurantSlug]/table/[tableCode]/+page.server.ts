import { getRestaurant } from '$lib/mock/restaurants';

export function load({ params }) {
	return {
		restaurant: getRestaurant(params.restaurantSlug),
		tableCode: params.tableCode
	};
}
