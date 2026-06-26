import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { resolvePublicCatalog } from '$lib/server/tenant/public-context';
import { findOrderById } from '$lib/server/repositories/order-repository';
import { listPaymentMethods } from '$lib/server/repositories/payment-method-repository';
import { withDirectTransaction, getPool } from '$lib/server/db/postgres';
import { getStorageProvider } from '$lib/server/providers/storage/factory';

const ALLOWED_PROOF_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMime = (typeof ALLOWED_PROOF_MIME)[number];

export const load: PageServerLoad = async ({ params }) => {
	const { slug, id } = params;

	const outlet = await resolvePublicCatalog(slug);
	if (!outlet) {
		throw error(404, 'Outlet tidak ditemukan');
	}

	const [order, paymentMethods] = await Promise.all([
		withDirectTransaction(async (client) => {
			return findOrderById(client, {
				organizationId: outlet.organizationId,
				outletId: outlet.id,
				orderId: id
			});
		}),
		listPaymentMethods({
			organizationId: outlet.organizationId,
			outletId: outlet.id
		})
	]);

	if (!order) {
		throw error(404, 'Pesanan tidak ditemukan');
	}

	return {
		restaurant: outlet,
		order,
		paymentMethods,
		checkoutMode: outlet.checkoutSettings.checkoutMode,
		paymentConfirmationEnabled: outlet.checkoutSettings.paymentConfirmationEnabled
	};
};

export const actions: Actions = {
	/**
	 * Buyer submits payment proof (upload image) — online mode only.
	 * The image is stored via the storage provider; the order's payment_proof_url is updated.
	 */
	submitProof: async ({ request, params }) => {
		const { slug, id: orderId } = params;

		const outlet = await resolvePublicCatalog(slug);
		if (!outlet) return fail(404, { error: 'Outlet tidak ditemukan' });

		if (!outlet.checkoutSettings.paymentConfirmationEnabled) {
			return fail(400, { error: 'Konfirmasi pembayaran tidak aktif untuk outlet ini.' });
		}

		const formData = await request.formData();
		const proofFile = formData.get('proofFile');

		if (!(proofFile instanceof File) || proofFile.size === 0) {
			return fail(400, { error: 'File bukti pembayaran wajib diunggah.' });
		}

		if (!ALLOWED_PROOF_MIME.includes(proofFile.type as AllowedMime)) {
			return fail(400, { error: 'Format file tidak didukung. Gunakan JPG, PNG, atau WebP.' });
		}

		// Max 5 MB
		if (proofFile.size > 5 * 1024 * 1024) {
			return fail(400, { error: 'Ukuran file maksimal 5 MB.' });
		}

		try {
			const storage = getStorageProvider();
			const arrayBuffer = await proofFile.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			const { publicUrl } = await storage.storeFile(buffer, {
				organizationId: outlet.organizationId,
				sourceType: 'payment-proof',
				fileName: proofFile.name,
				mimeType: proofFile.type,
				sizeBytes: proofFile.size
			});

			await getPool().query(
				`UPDATE orders
				 SET payment_proof_url = $1, updated_at = now()
				 WHERE id = $2::uuid AND organization_id = $3::uuid AND outlet_id = $4::uuid
				   AND status NOT IN ('completed', 'cancelled')`,
				[publicUrl, orderId, outlet.organizationId, outlet.id]
			);

			return { success: true, proofUrl: publicUrl };
		} catch (err) {
			console.error('[order/submitProof] failed:', err);
			return fail(500, { error: 'Gagal mengunggah bukti pembayaran. Coba lagi.' });
		}
	}
};
