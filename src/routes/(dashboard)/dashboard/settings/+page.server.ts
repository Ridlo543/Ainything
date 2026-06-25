import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { appEnv } from '$lib/server/config/env';
import {
	getRestaurantSettings,
	updateRestaurantSettings
} from '$lib/server/repositories/staff-repository';

interface RestaurantSettings {
	name: string;
	slug: string;
	location: string;
	segment: string;
	timezone: string;
	defaultLanguageTag: string;
	languageTags: string[];
	description: string;
	status: string;
}

function getMockSettings(): RestaurantSettings {
	return {
		name: 'Bali Table Restaurant',
		slug: 'bali-table',
		location: 'Jl. Sunset Road No. 88, Seminyak, Bali',
		segment: 'restaurant',
		timezone: 'Asia/Makassar',
		defaultLanguageTag: 'id',
		languageTags: ['id', 'en'],
		description: 'Authentic Balinese cuisine in the heart of Seminyak',
		status: 'active'
	};
}

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	const restaurant = tenant.activeRestaurant;

	if (!appEnv.databaseUrl || appEnv.useMockBackend) {
		return { settings: getMockSettings() };
	}

	try {
		const row = await getRestaurantSettings(restaurant.id);
		if (!row) return { settings: getMockSettings() };

		return {
			settings: {
				name: row.name,
				slug: row.slug,
				location: row.location ?? '',
				segment: row.segment ?? 'restaurant',
				timezone: row.timezone ?? 'Asia/Makassar',
				defaultLanguageTag: row.default_language_tag ?? 'id',
				languageTags: row.language_tags ?? ['id'],
				description: row.description ?? '',
				status: row.status ?? 'active'
			}
		};
	} catch {
		return { settings: getMockSettings() };
	}
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const location = formData.get('location')?.toString().trim();
		const description = formData.get('description')?.toString().trim() ?? '';
		const timezone = formData.get('timezone')?.toString().trim() ?? 'Asia/Makassar';
		const defaultLanguageTag = formData.get('defaultLanguageTag')?.toString().trim() ?? 'id';
		const segment = formData.get('segment')?.toString().trim() ?? 'restaurant';

		if (!name) return fail(400, { error: 'Nama restoran wajib diisi' });
		if (!location) return fail(400, { error: 'Lokasi wajib diisi' });

		if (!appEnv.databaseUrl || appEnv.useMockBackend) {
			return { success: true };
		}

		try {
			const tenantContext = await import('$lib/server/tenant/tenant-context').then((m) =>
				m.resolveTenantContext(user)
			);
			await updateRestaurantSettings(
				tenantContext.activeRestaurant.id,
				tenantContext.organization.id,
				{
					name,
					location,
					segment,
					description,
					timezone,
					defaultLanguageTag
				}
			);
			return { success: true };
		} catch {
			return fail(500, { error: 'Gagal menyimpan pengaturan' });
		}
	}
};
