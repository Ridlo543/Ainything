import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
	}

	// Staff → staff inbox
	if (locals.user.platformRole === 'staff') {
		redirect(303, '/staff/inbox');
	}

	return {
		tenant: await resolveTenantContext(locals.user, url.searchParams.get('outlet') ?? undefined)
	};
};
