import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { appEnv } from '$lib/server/config/env';
import { withTransaction } from '$lib/server/db/postgres';
import {
	listOrdersForRestaurant,
	findOrderById,
	updateOrderStatus
} from '$lib/server/repositories/order-repository';
import type { OrderStatus, OrderWithItems } from '$lib/domain/order/types';

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
		id: order.id.slice(0, 8),
		fullId: order.id,
		table: order.tableCode ? `Meja ${order.tableCode}` : order.customerName || 'Takeaway',
		location: order.tableCode ? 'Main Dining' : '',
		items: order.items.map((i) => ({ name: i.name, qty: i.quantity, note: i.notes || '' })),
		total: order.total,
		status:
			order.status === 'new' ? 'pending' : order.status === 'completed' ? 'done' : order.status,
		rawStatus: order.status,
		time: timeAgo(new Date(order.createdAt)),
		ts: new Date(order.createdAt)
	};
}

export const load: PageServerLoad = async ({ parent, url }) => {
	const { tenant } = await parent();
	const org = tenant.organization;
	const restaurant = tenant.activeRestaurant;
	const selectedId = url.searchParams.get('order');

	if (!appEnv.databaseUrl || appEnv.useMockBackend) {
		const mockOrders = getMockOrders();
		const selectedOrder = selectedId ? mockOrders.find((o) => o.id === selectedId) || null : null;
		return { orders: mockOrders, selectedOrder };
	}

	try {
		const orders = await listOrdersForRestaurant({
			organizationId: org.id,
			restaurantId: restaurant.id,
			limit: 50
		});

		const ordersWithItems = await Promise.all(
			orders.map(async (order) => {
				const full = await withTransaction(async (client) => {
					return findOrderById(client, {
						organizationId: org.id,
						restaurantId: restaurant.id,
						orderId: order.id
					});
				});
				return full ? mapOrderForUI(full) : null;
			})
		);

		const validOrders = ordersWithItems.filter(Boolean) as ReturnType<typeof mapOrderForUI>[];
		const selectedOrder = selectedId
			? validOrders.find((o) => o.id === selectedId || o.fullId === selectedId) || null
			: null;

		return { orders: validOrders, selectedOrder };
	} catch (err) {
		console.error('[orders] Failed to load orders, falling back to mock:', err);
		const mockOrders = getMockOrders();
		const selectedOrder = selectedId ? mockOrders.find((o) => o.id === selectedId) || null : null;
		return { orders: mockOrders, selectedOrder };
	}
};

export const actions: Actions = {
	updateStatus: async ({ request, locals }) => {
		const formData = await request.formData();
		const orderId = formData.get('orderId') as string;
		const newStatus = formData.get('status') as OrderStatus;

		if (!orderId || !newStatus) return fail(400, { error: 'Missing order ID or status' });

		const user = locals.user;
		if (!user) return fail(401, { error: 'Not authenticated' });

		if (!appEnv.databaseUrl || appEnv.useMockBackend) {
			return { success: true, orderId, newStatus };
		}

		try {
			const tenantContext = await import('$lib/server/tenant/tenant-context').then((m) =>
				m.resolveTenantContext(user)
			);
			const updated = await updateOrderStatus({
				userId: user.id,
				organizationId: tenantContext.organization.id,
				restaurantId: tenantContext.activeRestaurant.id,
				orderId,
				newStatus
			});
			if (!updated) return fail(404, { error: 'Order not found' });
			return { success: true, orderId, newStatus };
		} catch (err) {
			console.error('[orders] Status update failed:', err);
			return fail(500, { error: 'Failed to update order status' });
		}
	}
};

function getMockOrders() {
	return [
		{
			id: '1024',
			fullId: 'mock-1024',
			table: 'Meja T03',
			location: 'Main Dining',
			items: [
				{ name: 'Ayam Betutu', qty: 1, note: 'tidak pedas' },
				{ name: 'Es Kelapa Muda', qty: 2, note: '' }
			],
			total: 182000,
			status: 'pending',
			rawStatus: 'new' as OrderStatus,
			time: '2 mnt lalu',
			ts: new Date(Date.now() - 2 * 60000)
		},
		{
			id: '1023',
			fullId: 'mock-1023',
			table: 'Meja T07',
			location: 'Main Dining',
			items: [{ name: 'Ikan Bakar Jimbaran', qty: 2, note: 'sambal terpisah' }],
			total: 290000,
			status: 'processing',
			rawStatus: 'processing' as OrderStatus,
			time: '8 mnt lalu',
			ts: new Date(Date.now() - 8 * 60000)
		},
		{
			id: '1022',
			fullId: 'mock-1022',
			table: 'Takeaway',
			location: '',
			items: [
				{ name: 'Sate Ayam', qty: 3, note: '' },
				{ name: 'Es Cendol', qty: 2, note: '' }
			],
			total: 312000,
			status: 'done',
			rawStatus: 'completed' as OrderStatus,
			time: '15 mnt lalu',
			ts: new Date(Date.now() - 15 * 60000)
		},
		{
			id: '1021',
			fullId: 'mock-1021',
			table: 'Meja B12',
			location: 'Main Dining',
			items: [
				{ name: 'Betutu Chicken', qty: 2, note: '' },
				{ name: 'Es Teh Manis', qty: 3, note: '' }
			],
			total: 322000,
			status: 'done',
			rawStatus: 'completed' as OrderStatus,
			time: '22 mnt lalu',
			ts: new Date(Date.now() - 22 * 60000)
		},
		{
			id: '1020',
			fullId: 'mock-1020',
			table: 'Meja T01',
			location: 'Main Dining',
			items: [{ name: 'Lamb Satay', qty: 2, note: 'no peanut' }],
			total: 196000,
			status: 'cancelled',
			rawStatus: 'cancelled' as OrderStatus,
			time: '30 mnt lalu',
			ts: new Date(Date.now() - 30 * 60000)
		},
		{
			id: '1019',
			fullId: 'mock-1019',
			table: 'Meja T05',
			location: 'Main Dining',
			items: [
				{ name: 'Grilled Sea Bass', qty: 1, note: '' },
				{ name: 'Coconut Cendol', qty: 1, note: '' }
			],
			total: 207000,
			status: 'done',
			rawStatus: 'completed' as OrderStatus,
			time: '45 mnt lalu',
			ts: new Date(Date.now() - 45 * 60000)
		}
	];
}
