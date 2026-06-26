import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { listOrdersWithItems, updateOrderStatus } from '$lib/server/repositories/order-repository';
import { getPool } from '$lib/server/db/postgres';
import type { OrderStatus, OrderWithItems } from '$lib/domain/order/types';
import {
	notifyBuyerPaymentConfirmed,
	notifyBuyerPaymentRejected
} from '$lib/server/services/order-notification-service';

function timeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	if (seconds < 60) return `${seconds} dtk lalu`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes} mnt lalu`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} jam lalu`;
	return `${Math.floor(hours / 24)} hari lalu`;
}

function mapOrderForUI(order: OrderWithItems) {
	return {
		id: `#${String(order.orderNumber).padStart(4, '0')}`,
		fullId: order.id,
		orderNumber: order.orderNumber,
		table: order.tableCode ? `Meja ${order.tableCode}` : order.customerName || 'Takeaway',
		location: order.tableCode ? 'Main Dining' : '',
		items: order.items.map((i) => ({ name: i.name, qty: i.quantity, note: i.notes || '' })),
		total: order.total,
		status:
			order.status === 'new' ? 'pending' : order.status === 'completed' ? 'done' : order.status,
		rawStatus: order.status,
		time: timeAgo(new Date(order.createdAt)),
		ts: new Date(order.createdAt),
		// Payment fields for online mode
		buyerWhatsapp: order.buyerWhatsapp ?? null,
		paymentProofUrl: order.paymentProofUrl ?? null,
		paymentConfirmedAt: order.paymentConfirmedAt ?? null,
		paymentRejectedAt: order.paymentRejectedAt ?? null,
		paymentNotes: order.paymentNotes ?? null
	};
}

export const load: PageServerLoad = async ({ parent, url }) => {
	const { tenant } = await parent();
	const org = tenant.organization;
	const outlet = tenant.activeOutlet;
	const selectedId = url.searchParams.get('order');

	try {
		const ordersWithItems = await listOrdersWithItems({
			organizationId: org.id,
			outletId: outlet.id,
			limit: 50
		});

		const validOrders = ordersWithItems.map(mapOrderForUI);
		const selectedOrder = selectedId
			? validOrders.find((o) => o.id === selectedId || o.fullId === selectedId) || null
			: null;

		return {
			orders: validOrders,
			selectedOrder,
			paymentConfirmationEnabled: outlet.checkoutSettings.paymentConfirmationEnabled
		};
	} catch (err) {
		console.error('[orders] Failed to load orders:', err);
		return { orders: [], selectedOrder: null, paymentConfirmationEnabled: false };
	}
};

export const actions: Actions = {
	updateStatus: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const orderId = formData.get('orderId') as string;
		const newStatus = formData.get('status') as OrderStatus;

		if (!orderId || !newStatus) return fail(400, { error: 'Missing orderId or status' });

		const validStatuses: OrderStatus[] = ['new', 'processing', 'completed', 'cancelled'];
		if (!validStatuses.includes(newStatus)) {
			return fail(400, { error: `Invalid status: ${newStatus}` });
		}

		try {
			const { resolveTenantContext } = await import('$lib/server/tenant/tenant-context');
			const tenantContext = await resolveTenantContext(user);

			const updated = await updateOrderStatus({
				userId: user.id,
				organizationId: tenantContext.organization.id,
				outletId: tenantContext.activeOutlet.id,
				orderId,
				newStatus
			});

			if (!updated) return fail(404, { error: 'Order not found' });

			return { success: true, newStatus };
		} catch (err) {
			console.error('[orders] updateStatus failed:', err);
			return fail(500, { error: 'Failed to update order status' });
		}
	},

	/**
	 * Owner/manager confirms a buyer's uploaded payment proof.
	 */
	confirmPayment: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const orderId = formData.get('orderId')?.toString();
		if (!orderId) return fail(400, { error: 'Missing orderId' });

		try {
			const { resolveTenantContext } = await import('$lib/server/tenant/tenant-context');
			const tenantContext = await resolveTenantContext(user);

			const role = tenantContext.membership?.role;
			if (role === 'staff')
				return fail(403, { error: 'Tidak punya akses untuk konfirmasi pembayaran' });

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

			// Fire-and-forget WA notification to buyer.
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

			return { success: true, action: 'confirmed' };
		} catch (err) {
			console.error('[orders] confirmPayment failed:', err);
			return fail(500, { error: 'Gagal mengkonfirmasi pembayaran.' });
		}
	},

	/**
	 * Owner/manager rejects a buyer's uploaded payment proof.
	 */
	rejectPayment: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const orderId = formData.get('orderId')?.toString();
		const notes = formData.get('notes')?.toString()?.trim() || null;
		if (!orderId) return fail(400, { error: 'Missing orderId' });

		try {
			const { resolveTenantContext } = await import('$lib/server/tenant/tenant-context');
			const tenantContext = await resolveTenantContext(user);

			const role = tenantContext.membership?.role;
			if (role === 'staff')
				return fail(403, { error: 'Tidak punya akses untuk menolak pembayaran' });

			const result = await getPool().query<{
				id: string;
				buyer_whatsapp: string | null;
				order_number: number;
				total: number;
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
				 RETURNING id, buyer_whatsapp, order_number, total`,
				[user.id, notes, orderId, tenantContext.organization.id, tenantContext.activeOutlet.id]
			);

			if (result.rowCount === 0) {
				return fail(404, { error: 'Pesanan tidak ditemukan atau sudah dikonfirmasi.' });
			}

			// Fire-and-forget WA notification to buyer.
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

			return { success: true, action: 'rejected' };
		} catch (err) {
			console.error('[orders] rejectPayment failed:', err);
			return fail(500, { error: 'Gagal menolak pembayaran.' });
		}
	}
};
