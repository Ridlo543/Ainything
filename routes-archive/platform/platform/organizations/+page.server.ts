import { error } from '@sveltejs/kit';
import { listOrganizationsSchema } from '$lib/domain/platform/schema';
import {
	listOrganizations,
	PlatformAdminInputError
} from '$lib/server/services/platform-admin-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const parseResult = listOrganizationsSchema.safeParse({
		limit: 50,
		offset: url.searchParams.get('offset') ?? 0,
		status: url.searchParams.get('status') ?? 'all'
	});

	if (!parseResult.success) {
		throw error(400, parseResult.error.issues.map((i) => i.message).join(', '));
	}

	try {
		const organizations = await listOrganizations(parseResult.data);
		return { organizations, offset: parseResult.data.offset, status: parseResult.data.status };
	} catch (err) {
		if (err instanceof PlatformAdminInputError) {
			throw error(400, err.message);
		}
		console.warn('[platform organizations] Could not load organizations', err);
		throw error(500, 'Could not load organizations.');
	}
};
