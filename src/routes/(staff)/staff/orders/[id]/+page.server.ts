import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	getStaffOrder,
	transitionStaffOrder,
	StaffOrderError
} from '$lib/server/services/staff-order-service';
import { transitionOrderStatusSchema } from '$lib/domain/order/schema';
import type { OrderStatus } from '$lib/domain/order/types';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';
import { getPool } from '$lib/server/db/postgres';
import {
	notifyBuyerPaymentConfirmed,
	notifyBuyerPaymentRejected
} from '$lib/server/services/order-notification-service';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user;
	if (!user) redirect(303, '/login');

	try {
		const order = await getStaffOrder(user, { orderId: params.id });
		return { order };
	} catch (err) {
		if (err instanceof StaffOrderError && err.code === 'NOT_FOUND') {
			redirect(303, '/staff/inbox');
		}
		throw err;
	}
};

export const actions: Actions = {
	transition: async ({ request, locals, params }) => {
		const user = locals.user;
		if (!user) redirect(303, '/login');

		const formData = await request.formData();
		const newStatus = formData.get('status') as string;

		const parsed = transitionOrderStatusSchema.safeParse({
			orderId: params.id,
			outletId: 'skip-client-validation', // outletId validated server-side in transitionStaffOrder
			newStatus
		});

		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Status tidak valid.' });
		}

		try {
			await transitionStaffOrder(user, {
				orderId: params.id,
				newStatus: newStatus as OrderStatus
			});
		} catch (err) {
			if (err instanceof StaffOrderError) {
				return fail(400, { error: err.message });
			}
			throw err;
		}

		redirect(303, `/staff/orders/${params.id}`);
	},

	/**
	 * Staff confirms a buyer's uploaded payment proof.
	 * Only owner/manager role can confirm — staff role is blocked.
	 */
	confirmPayment: async ({ request, locals, params }) => {
		const user = locals.user;
		if (!user) redirect(303, '/login');

		const formData = await request.formData();
		const orderId = formData.get('orderId')?.toString();
		if (!orderId) return fail(400, { error: 'Missing orderId' });

		try {
			const tenantContext = await resolveTenantContext(user);
			const role = tenantContext.membership?.role;
			if (role === 'staff') {
				return fail(403, { error: 'Tidak punya akses untuk konfirmasi pembayaran' });
			}

			const result = await getPool().query<{
				id: string;
				buyer_whatsapp: string | null;
				order_number: number;
				total: number;
			}>(
				`UPDATE orders
				 SET payment_confirmed_at = now(),
				     payment_confirmed_by = $1::uuid,
				     payment_rejected_at = NULL,
				     payment_rejected_by = NULL,
				     updated_at = now()
				 WHERE id = $2::uuid
				   AND organization_id = $3::uuid
				   AND outlet_id = $4::uuid
				   AND payment_proof_url IS NOT NULL
				   AND payment_confirmed_at IS NULL
				 RETURNING id, buyer_whatsapp, order_number, total`,
				[user.id, orderId, tenantContext.organization.id, tenantContext.activeOutlet.id]
			);

			if (result.rowCount === 0) {
				return fail(404, { error: 'Pesanan tidak ditemukan atau sudah dikonfirmasi.' });
			}

			const row = result.rows[0];
			if (row.buyer_whatsapp) {
				notifyBuyerPaymentConfirmed({
					buyerWhatsapp: row.buyer_whatsapp,
					outletName: tenantContext.activeOutlet.name,
					orderNumber: `#${String(row.order_number).padStart(4, '0')}`,
					orderId: row.id,
					total: row.total
				}).catch(() => {});
			}

			redirect(303, `/staff/orders/${params.id}`);
		} catch (err) {
			if (err instanceof StaffOrderError) return fail(400, { error: err.message });
			throw err;
		}
	},

	/**
	 * Staff rejects a buyer's uploaded payment proof.
	 * Only owner/manager role can reject — staff role is blocked.
	 */
	rejectPayment: async ({ request, locals, params }) => {
		const user = locals.user;
		if (!user) redirect(303, '/login');

		const formData = await request.formData();
		const orderId = formData.get('orderId')?.toString();
		const notes = formData.get('notes')?.toString()?.trim() || null;
		if (!orderId) return fail(400, { error: 'Missing orderId' });

		try {
			const tenantContext = await resolveTenantContext(user);
			const role = tenantContext.membership?.role;
			if (role === 'staff') {
				return fail(403, { error: 'Tidak punya akses untuk menolak pembayaran' });
			}

			const result = await getPool().query<{
				id: string;
				buyer_whatsapp: string | null;
				order_number: number;
			}>(
				`UPDATE orders
				 SET payment_rejected_at = now(),
				     payment_rejected_by = $1::uuid,
				     payment_notes = $2,
				     payment_confirmed_at = NULL,
				     payment_confirmed_by = NULL,
				     updated_at = now()
				 WHERE id = $3::uuid
				   AND organization_id = $4::uuid
				   AND outlet_id = $5::uuid
				   AND payment_proof_url IS NOT NULL
				   AND payment_confirmed_at IS NULL
				 RETURNING id, buyer_whatsapp, order_number`,
				[user.id, notes, orderId, tenantContext.organization.id, tenantContext.activeOutlet.id]
			);

			if (result.rowCount === 0) {
				return fail(404, { error: 'Pesanan tidak ditemukan atau sudah dikonfirmasi.' });
			}

			const row = result.rows[0];
			if (row.buyer_whatsapp) {
				notifyBuyerPaymentRejected({
					buyerWhatsapp: row.buyer_whatsapp,
					outletName: tenantContext.activeOutlet.name,
					orderNumber: `#${String(row.order_number).padStart(4, '0')}`,
					orderId: row.id,
					notes
				}).catch(() => {});
			}

			redirect(303, `/staff/orders/${params.id}`);
		} catch (err) {
			if (err instanceof StaffOrderError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
