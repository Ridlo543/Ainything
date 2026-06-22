import { error } from '@sveltejs/kit';
import { listRestaurantsSchema } from '$lib/domain/platform/schema';
import {
	listRestaurants,
	PlatformAdminInputError
} from '$lib/server/services/platform-admin-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const parseResult = listRestaurantsSchema.safeParse({
		limit: 50,
		offset: url.searchParams.get('offset') ?? 0,
		organizationId: url.searchParams.get('org') ?? undefined
	});

	if (!parseResult.success) {
		throw error(400, parseResult.error.issues.map((i) => i.message).join(', '));
	}

	try {
		const restaurants = await listRestaurants(parseResult.data);
		return { restaurants, offset: parseResult.data.offset };
	} catch (err) {
		if (err instanceof PlatformAdminInputError) {
			throw error(400, err.message);
		}
		console.warn('[platform restaurants] Could not load restaurants', err);
		throw error(500, 'Could not load restaurants.');
	}
};
