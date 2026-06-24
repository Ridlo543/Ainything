import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const tenantSlug = params.slug;

	if (!tenantSlug) {
		error(404, 'Tenant not found');
	}

	// TODO: Load tenant by slug from database/API.
	// For now, return mock data for layout development.
	return {
		tenant: {
			slug: tenantSlug,
			name: tenantSlug,
			heroImage: '',
			description: ''
		}
	};
};
