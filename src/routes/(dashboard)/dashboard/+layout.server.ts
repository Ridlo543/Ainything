import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
	}

	if (locals.user.platformRole !== 'super_admin' && locals.user.platformRole !== 'org_owner') {
		// TODO: once fine-grained org_role / restaurant_role is wired, tighten to
		// org_owner || restaurant_admin. For now, staff members are excluded.
		if (locals.user.platformRole === 'staff') {
			redirect(303, '/staff/inbox');
		}
	}

	return {
		tenant: await resolveTenantContext(locals.user, url.searchParams.get('restaurant') ?? undefined)
	};
};
