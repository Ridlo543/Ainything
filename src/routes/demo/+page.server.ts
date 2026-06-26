import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listOutlets } from '$lib/server/repositories/outlet-repository';
import { getOrganizationBySlugRow } from '$lib/server/repositories/platform-repository';

// The demo org slug is stable — seeded by db/seeds/0001_demo_multi_tenant_data.sql
const DEMO_ORG_SLUG = 'bali-table-group';

export const load: PageServerLoad = async () => {
	// In production, redirect to home — demo is a dev/staging showcase only.
	if (process.env.NODE_ENV === 'production') {
		redirect(302, '/');
	}

	const org = await getOrganizationBySlugRow(DEMO_ORG_SLUG);

	if (!org) {
		// DB not seeded yet — render page with empty state so the UI can guide the user.
		return {
			organization: null,
			outlets: [],
			primaryOutlet: null
		};
	}

	const outlets = await listOutlets(org.id);
	const primaryOutlet = outlets[0] ?? null;

	return {
		organization: {
			id: org.id,
			name: org.name,
			slug: org.slug,
			workspaceHost: org.workspaceHost
		},
		outlets: outlets.map((o) => ({
			id: o.id,
			name: o.name,
			slug: o.slug,
			publicHost: o.publicHost,
			location: o.location,
			businessType: o.businessType
		})),
		primaryOutlet: primaryOutlet
			? {
					id: primaryOutlet.id,
					name: primaryOutlet.name,
					slug: primaryOutlet.slug,
					publicHost: primaryOutlet.publicHost
				}
			: null
	};
};
