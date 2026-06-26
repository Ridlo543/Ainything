import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	listPaymentMethodsForDashboard,
	savePaymentMethod,
	removePaymentMethod,
	PaymentMethodError
} from '$lib/server/services/payment-method-service';
import { getStorageProvider } from '$lib/server/providers/storage/factory';

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	const { user, organization, activeOutlet } = tenant;

	const paymentMethods = await listPaymentMethodsForDashboard(
		user,
		activeOutlet.id,
		organization.id
	);

	return { paymentMethods };
};

export const actions: Actions = {
	/** Create or update a payment method. */
	save: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();

		// Handle optional QRIS image upload
		const qrImageFile = formData.get('qrImage') as File | null;
		let qrImageUrl: string | null = formData.get('qrImageUrl')?.toString() || null;

		if (qrImageFile && qrImageFile.size > 0) {
			if (!['image/png', 'image/jpeg', 'image/webp'].includes(qrImageFile.type)) {
				return fail(400, { error: 'Format gambar QRIS tidak didukung. Gunakan PNG, JPG, atau WebP.' });
			}
			if (qrImageFile.size > 2 * 1024 * 1024) {
				return fail(400, { error: 'Ukuran gambar QRIS maksimal 2MB.' });
			}

			try {
				const { resolveTenantContext } = await import('$lib/server/tenant/tenant-context');
				const tenant = await resolveTenantContext(user);
				const storage = getStorageProvider();
				const buffer = Buffer.from(await qrImageFile.arrayBuffer());
				const stored = await storage.storeFile(buffer, {
					organizationId: tenant.organization.id,
					sourceType: 'qris-image',
					fileName: qrImageFile.name,
					mimeType: qrImageFile.type,
					sizeBytes: qrImageFile.size
				});
				qrImageUrl = stored.publicUrl;
			} catch {
				return fail(500, { error: 'Gagal mengunggah gambar QRIS' });
			}
		}

		try {
			const { resolveTenantContext } = await import('$lib/server/tenant/tenant-context');
			const tenant = await resolveTenantContext(user);

			const rawInput = {
				id: formData.get('id')?.toString() || undefined,
				type: formData.get('type')?.toString(),
				label: formData.get('label')?.toString()?.trim(),
				accountNumber: formData.get('accountNumber')?.toString()?.trim() || null,
				accountName: formData.get('accountName')?.toString()?.trim() || null,
				qrImageUrl,
				instructions: formData.get('instructions')?.toString()?.trim() || null,
				isActive: formData.get('isActive') !== 'false',
				sortOrder: parseInt(formData.get('sortOrder')?.toString() ?? '0', 10) || 0
			};

			await savePaymentMethod(user, tenant.organization.id, tenant.activeOutlet.id, rawInput);
			return { success: true };
		} catch (err) {
			if (err instanceof PaymentMethodError) {
				return fail(err.code === 'FORBIDDEN' ? 403 : 400, { error: err.message });
			}
			return fail(500, { error: 'Gagal menyimpan metode pembayaran' });
		}
	},

	/** Delete a payment method. */
	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const paymentMethodId = formData.get('paymentMethodId')?.toString();
		if (!paymentMethodId) return fail(400, { error: 'ID metode pembayaran tidak valid' });

		try {
			const { resolveTenantContext } = await import('$lib/server/tenant/tenant-context');
			const tenant = await resolveTenantContext(user);

			await removePaymentMethod(user, tenant.organization.id, tenant.activeOutlet.id, {
				paymentMethodId
			});
			return { success: true };
		} catch (err) {
			if (err instanceof PaymentMethodError) {
				return fail(err.code === 'FORBIDDEN' ? 403 : 400, { error: err.message });
			}
			return fail(500, { error: 'Gagal menghapus metode pembayaran' });
		}
	}
};
