import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { restaurantSettingsSchema } from '$lib/domain/restaurant/schema';
import {
	getRestaurantSettings,
	updateRestaurantSettings
} from '$lib/server/repositories/staff-repository';
import { appEnv } from '$lib/server/config/env';

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();

	let settings = null;

	if (appEnv.databaseUrl && !appEnv.useMockBackend) {
		try {
			settings = await getRestaurantSettings(tenant.activeRestaurant.id);
		} catch (err) {
			if (appEnv.nodeEnv === 'production') throw err;
			console.warn('[settings] Could not load restaurant settings:', err);
		}
	}

	// Fall back to in-memory data from tenant context
	if (!settings) {
		const r = tenant.activeRestaurant;
		settings = {
			id: r.id,
			name: r.name,
			slug: r.slug,
			location: r.location,
			segment: r.segment,
			timezone: 'Asia/Jakarta',
			default_language_tag: r.languages[0] ?? 'id',
			language_tags: r.languages,
			description: r.description,
			status: 'active'
		};
	}

	return { tenant, settings };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		type FieldMap = Record<string, string> | null;

		if (!locals.user) {
			return fail(401, { error: 'Unauthorized', fields: null as FieldMap });
		}

		const membership = locals.user.memberships[0];
		if (!membership) {
			return fail(400, { error: 'No organization found', fields: null as FieldMap });
		}

		if (membership.role !== 'org_owner' && membership.role !== 'restaurant_admin') {
			return fail(403, { error: 'Only owners can update restaurant settings', fields: null as FieldMap });
		}

		const formData = await request.formData();
		const raw = {
			name: formData.get('name')?.toString() ?? '',
			location: formData.get('location')?.toString() ?? '',
			segment: formData.get('segment')?.toString() ?? '',
			timezone: formData.get('timezone')?.toString() ?? '',
			defaultLanguageTag: formData.get('defaultLanguageTag')?.toString() ?? '',
			description: formData.get('description')?.toString() ?? ''
		};

		const result = restaurantSettingsSchema.safeParse(raw);
		if (!result.success) {
			const issues = result.error.issues
				.map((i) => `${i.path.join('.') || 'value'}: ${i.message}`)
				.join(', ');
			return fail(400, { error: issues, fields: raw as FieldMap });
		}

		const restaurantId = formData.get('restaurantId')?.toString() ?? '';
		if (!restaurantId) {
			return fail(400, { error: 'Missing restaurant ID', fields: null as FieldMap });
		}

		try {
			await updateRestaurantSettings(restaurantId, membership.organizationId, result.data);
			return { success: true, error: null, fields: null as FieldMap };
		} catch (err) {
			console.error('[settings] update error:', err);
			return fail(500, { error: 'Failed to save settings', fields: null as FieldMap });
		}
	}
};
