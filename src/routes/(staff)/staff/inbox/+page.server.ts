import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { listStaffOrders } from '$lib/server/services/staff-order-service';
import { transitionStaffOrder, StaffOrderError } from '$lib/server/services/staff-order-service';
import type { OrderStatus } from '$lib/domain/order/types';

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	// Register dependency so invalidate('app:inbox') from the Svelte polling
	// effect re-runs only this load, not the full layout chain.
	depends('app:inbox');

	const user = locals.user;
	if (!user) return { orders: [] };

	const statusFilter = url.searchParams.get('status');
	const statuses = statusFilter
		? (statusFilter.split(',').filter(Boolean) as OrderStatus[])
		: undefined;

	const orders = await listStaffOrders(user, { statuses });

	return { orders };
};

export const actions: Actions = {
	/**
	 * Quick one-tap status transition directly from the inbox list.
	 * Used by inline action buttons on each order card.
	 */
	transition: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Tidak terautentikasi.' });

		const formData = await request.formData();
		const orderId = formData.get('orderId')?.toString();
		const newStatus = formData.get('status')?.toString() as OrderStatus | undefined;

		if (!orderId || !newStatus) {
			return fail(400, { error: 'orderId dan status wajib diisi.' });
		}

		try {
			await transitionStaffOrder(user, { orderId, newStatus });
			return { success: true, orderId, newStatus };
		} catch (err) {
			if (err instanceof StaffOrderError) {
				if (err.code === 'NOT_FOUND') return fail(404, { error: 'Pesanan tidak ditemukan.' });
				if (err.code === 'INVALID_TRANSITION')
					return fail(400, { error: err.message });
			}
			console.error('[inbox] transition failed:', err);
			return fail(500, { error: 'Gagal memperbarui status pesanan.' });
		}
	}
};
