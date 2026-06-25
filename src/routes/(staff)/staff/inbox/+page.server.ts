import type { PageServerLoad } from './$types';
import { listStaffOrders } from '$lib/server/services/staff-order-service';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) return { orders: [] };

	const statusFilter = url.searchParams.get('status');
	const statuses = statusFilter ? statusFilter.split(',').filter(Boolean) as import('$lib/domain/order/types').OrderStatus[] : undefined;

	const orders = await listStaffOrders(user, { statuses });

	return { orders };
};
