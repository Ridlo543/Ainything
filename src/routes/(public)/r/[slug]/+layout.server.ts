import type { LayoutServerLoad } from './$types';
import { resolvePublicCatalog } from '$lib/server/tenant/public-context';
import { loadPublicCatalog } from '$lib/server/repositories/public-catalog-repository';
import { error } from '@sveltejs/kit';
import { cachePolicy } from '$lib/server/cache/cache-policy';

export const load: LayoutServerLoad = async ({ params, url, request, setHeaders }) => {
	const restaurant = await resolvePublicCatalog(params.slug);

	if (!restaurant) {
		error(404, 'Restaurant not found');
	}

	const tableCode = url.searchParams.get('table') ?? undefined;
	const expectedHost = restaurant.publicHost || `${restaurant.slug}.ainything.online`;
	const host = request.headers.get('host') ?? '';
	const hostValidated = host.startsWith(expectedHost) || host.startsWith('localhost');

	const catalog = await loadPublicCatalog(restaurant.id);

	setHeaders(cachePolicy.PUBLIC_PAGE);

	return {
		restaurant,
		slug: params.slug,
		tableCode,
		hostValidated,
		products: catalog.products,
		sections: catalog.sections
	};
};
