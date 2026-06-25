import type { PageServerLoad } from './$types';
import { appEnv } from '$lib/server/config/env';
import { listOrdersForRestaurant } from '$lib/server/repositories/order-repository';
import { loadMenuItemsForRestaurant } from '$lib/server/repositories/admin-menu-repository';
import { withTransaction } from '$lib/server/db/postgres';
import { formatPrice } from '$lib/domain/menu/policy';

function timeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	if (seconds < 60) return `${seconds} dtk lalu`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes} mnt lalu`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} jam lalu`;
	return `${Math.floor(hours / 24)} hari lalu`;
}

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	const org = tenant.organization;
	const restaurant = tenant.activeRestaurant;

	if (!appEnv.databaseUrl || appEnv.useMockBackend) {
		return {
			stats: getMockStats(),
			recentOrders: getMockRecentOrders(),
			topProducts: getMockTopProducts()
		};
	}

	try {
		const [orders, menuItems] = await Promise.all([
			listOrdersForRestaurant({
				organizationId: org.id,
				restaurantId: restaurant.id,
				limit: 20
			}),
			withTransaction(async (client) => {
				return loadMenuItemsForRestaurant(client, {
					organizationId: org.id,
					restaurantId: restaurant.id
				});
			})
		]);

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const todayOrders = orders.filter((o) => new Date(o.createdAt) >= today);
		const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
		const activeOrders = orders.filter(
			(o) => o.status === 'new' || o.status === 'processing'
		);

		const stats = [
			{
				label: 'Pesanan Hari Ini',
				value: todayOrders.length.toString(),
				trend: '',
				up: true,
				icon: 'ShoppingCart',
				color: 'text-[#059669]',
				bg: 'bg-[#d1fae5]',
				note: 'hari ini'
			},
			{
				label: 'Pendapatan Hari Ini',
				value: formatPrice(todayRevenue),
				trend: '',
				up: true,
				icon: 'TrendingUp',
				color: 'text-[#d97706]',
				bg: 'bg-[#fef3c7]',
				note: 'hari ini'
			},
			{
				label: 'Menu Aktif',
				value: menuItems.filter((i) => i.isAvailable).length.toString(),
				trend: '',
				up: true,
				icon: 'Package',
				color: 'text-[#2563eb]',
				bg: 'bg-[#eff6ff]',
				note: `dari ${menuItems.length} total`
			},
			{
				label: 'Order Aktif',
				value: activeOrders.length.toString(),
				trend: '',
				up: true,
				icon: 'Clock',
				color: 'text-[#db2777]',
				bg: 'bg-[#fce7f3]',
				note: 'perlu diproses'
			}
		];

		const recentOrders = orders.slice(0, 5).map((o) => ({
			id: `#${o.id.slice(0, 8)}`,
			table: o.tableCode ? `Meja ${o.tableCode}` : o.customerName || 'Takeaway',
			items: `${o.itemCount} item`,
			total: formatPrice(o.total),
			status: o.status === 'new' ? 'pending' : o.status === 'completed' ? 'done' : o.status,
			time: timeAgo(new Date(o.createdAt))
		}));

		const itemCounts = new Map<string, { name: string; count: number; image: string }>();
		for (const order of orders) {
			const fullOrder = await withTransaction(async (client) => {
				const { findOrderById } = await import('$lib/server/repositories/order-repository');
				return findOrderById(client, {
					organizationId: org.id,
					restaurantId: restaurant.id,
					orderId: order.id
				});
			});
			if (fullOrder?.items) {
				for (const item of fullOrder.items) {
					const existing = itemCounts.get(item.name);
					if (existing) {
						existing.count += item.quantity;
					} else {
						const menuItem = menuItems.find((m) => m.id === item.menuItemId);
						itemCounts.set(item.name, {
							name: item.name,
							count: item.quantity,
							image: menuItem?.image || ''
						});
					}
				}
			}
		}

		const topProducts = [...itemCounts.values()]
			.sort((a, b) => b.count - a.count)
			.slice(0, 5)
			.map((p, _i, arr) => ({
				name: p.name,
				orders: p.count,
				pct: arr.length > 0 ? Math.round((p.count / arr[0].count) * 100) : 0,
				img: p.image || '/mock-images/photo-1604908176997-125f25cc6f3d.jpg'
			}));

		return { stats, recentOrders, topProducts };
	} catch (err) {
		console.error('[dashboard overview] Failed to load data, falling back to mock:', err);
		return {
			stats: getMockStats(),
			recentOrders: getMockRecentOrders(),
			topProducts: getMockTopProducts()
		};
	}
};

function getMockStats() {
	return [
		{
			label: 'Pesanan Hari Ini',
			value: '24',
			trend: '+12%',
			up: true,
			icon: 'ShoppingCart',
			color: 'text-[#059669]',
			bg: 'bg-[#d1fae5]',
			note: 'dari kemarin'
		},
		{
			label: 'Pendapatan Hari Ini',
			value: 'Rp 2,4 jt',
			trend: '+8%',
			up: true,
			icon: 'TrendingUp',
			color: 'text-[#d97706]',
			bg: 'bg-[#fef3c7]',
			note: 'dari kemarin'
		},
		{
			label: 'Kunjungan Katalog',
			value: '186',
			trend: '+23%',
			up: true,
			icon: 'Eye',
			color: 'text-[#2563eb]',
			bg: 'bg-[#eff6ff]',
			note: 'hari ini'
		},
		{
			label: 'Rating',
			value: '4.9',
			trend: '+0.1',
			up: true,
			icon: 'Star',
			color: 'text-[#db2777]',
			bg: 'bg-[#fce7f3]',
			note: 'bulan ini'
		}
	];
}

function getMockRecentOrders() {
	return [
		{ id: '#1024', table: 'Meja T03', items: 'Ayam Betutu x1, Es Kelapa x2', total: 'Rp 182.000', status: 'pending', time: '2 mnt lalu' },
		{ id: '#1023', table: 'Meja T07', items: 'Ikan Bakar Jimbaran x2', total: 'Rp 290.000', status: 'processing', time: '8 mnt lalu' },
		{ id: '#1022', table: 'Takeaway', items: 'Sate Ayam x3, Es Cendol x2', total: 'Rp 312.000', status: 'done', time: '15 mnt lalu' },
		{ id: '#1021', table: 'Meja B12', items: 'Betutu Chicken x2, Drink x3', total: 'Rp 322.000', status: 'done', time: '22 mnt lalu' },
		{ id: '#1020', table: 'Meja T01', items: 'Lamb Satay x2', total: 'Rp 196.000', status: 'cancelled', time: '30 mnt lalu' }
	];
}

function getMockTopProducts() {
	return [
		{ name: 'Ayam Betutu', orders: 48, pct: 100, img: '/mock-images/photo-1604908176997-125f25cc6f3d.jpg' },
		{ name: 'Ikan Bakar Jimbaran', orders: 36, pct: 75, img: '/mock-images/photo-1544943910-4c1dc44aab44.jpg' },
		{ name: 'Sate Ayam', orders: 29, pct: 60, img: '/mock-images/photo-1529543544282-ea669407fca3.jpg' },
		{ name: 'Es Kelapa Muda', orders: 22, pct: 46, img: '/mock-images/photo-1541518763669-27fef04b14ea.jpg' },
		{ name: 'Coconut Cendol', orders: 17, pct: 35, img: '/mock-images/photo-1534706270553-2ac0dfa30283.jpg' }
	];
}
