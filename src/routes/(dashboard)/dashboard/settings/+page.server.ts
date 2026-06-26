import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { updateOutletSettings } from '$lib/server/services/outlet-management-service';
import { updateOutletCheckoutSettings } from '$lib/server/repositories/outlet-repository';

interface PageSettings {
	name: string;
	slug: string;
	location: string;
	businessType: string;
	timezone: string;
	defaultLanguageTag: string;
	languageTags: string[];
	description: string;
	status: string;
	checkoutMode: 'offline' | 'online';
	requireBuyerWhatsapp: boolean;
	paymentConfirmationEnabled: boolean;
}

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	const outlet = tenant.activeOutlet;

	const settings: PageSettings = {
		name: outlet.name,
		slug: outlet.slug,
		location: outlet.location ?? '',
		businessType: outlet.businessType ?? 'restaurant',
		timezone: outlet.timezone ?? 'Asia/Makassar',
		defaultLanguageTag: outlet.defaultLanguageTag ?? 'id',
		languageTags: outlet.languages ?? ['id'],
		description: outlet.description ?? '',
		status: outlet.status ?? 'active',
		checkoutMode: outlet.checkoutSettings.checkoutMode,
		requireBuyerWhatsapp: outlet.checkoutSettings.requireBuyerWhatsapp,
		paymentConfirmationEnabled: outlet.checkoutSettings.paymentConfirmationEnabled
	};

	return { settings };
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
		const businessType = formData.get('businessType')?.toString().trim() ?? 'restaurant';

		if (!name) return fail(400, { error: 'Nama outlet wajib diisi' });
		if (!location) return fail(400, { error: 'Lokasi wajib diisi' });

		try {
			const { resolveTenantContext } = await import('$lib/server/tenant/tenant-context');
			const tenantContext = await resolveTenantContext(user);

			const BUSINESS_TYPES = ['restaurant', 'retail', 'service', 'cafe', 'hotel'] as const;
			const TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const;
			const LANGUAGE_TAGS = ['id', 'en', 'zh-Hans', 'ar', 'ja'] as const;

			const safeBusinessType = BUSINESS_TYPES.includes(businessType as never)
				? (businessType as (typeof BUSINESS_TYPES)[number])
				: undefined;
			const safeTimezone = TIMEZONES.includes(timezone as never)
				? (timezone as (typeof TIMEZONES)[number])
				: undefined;
			const safeLang = LANGUAGE_TAGS.includes(defaultLanguageTag as never)
				? (defaultLanguageTag as (typeof LANGUAGE_TAGS)[number])
				: undefined;

			await updateOutletSettings(user, tenantContext.activeOutlet.id, {
				name,
				location,
				businessType: safeBusinessType,
				description,
				timezone: safeTimezone,
				defaultLanguageTag: safeLang
			});
			return { success: true };
		} catch {
			return fail(500, { error: 'Gagal menyimpan pengaturan' });
		}
	},

	checkout: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const checkoutMode = formData.get('checkoutMode')?.toString();
		const requireBuyerWhatsapp = formData.get('requireBuyerWhatsapp') === 'true';
		const paymentConfirmationEnabled = formData.get('paymentConfirmationEnabled') === 'true';

		if (checkoutMode !== 'offline' && checkoutMode !== 'online') {
			return fail(400, { error: 'Checkout mode tidak valid.' });
		}

		try {
			const { resolveTenantContext } = await import('$lib/server/tenant/tenant-context');
			const tenantContext = await resolveTenantContext(user);

			const role = tenantContext.membership?.role;
			if (role === 'staff') return fail(403, { error: 'Tidak punya akses mengubah pengaturan checkout' });

			await updateOutletCheckoutSettings(
				tenantContext.activeOutlet.id,
				tenantContext.organization.id,
				{
					checkoutMode,
					requireBuyerWhatsapp,
					// paymentConfirmationEnabled only relevant when online
					paymentConfirmationEnabled: checkoutMode === 'online' ? paymentConfirmationEnabled : false
				}
			);

			return { success: true };
		} catch {
			return fail(500, { error: 'Gagal menyimpan pengaturan checkout.' });
		}
	}
};
