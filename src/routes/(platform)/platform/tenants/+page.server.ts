import type { PageServerLoad } from './$types';
import { listOrganizationsRows } from '$lib/server/repositories/platform-repository';

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get('status') ?? 'all';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const limit = 20;
	const offset = (page - 1) * limit;

	const tenants = await listOrganizationsRows({ limit, offset, status });

	return {
		tenants,
		filters: { status, page }
	};
};
