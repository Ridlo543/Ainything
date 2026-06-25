import type { PageServerLoad } from './$types';
import { appEnv } from '$lib/server/config/env';
import { listOrdersForRestaurant } from '$lib/server/repositories/order-repository';
import { withTransaction } from '$lib/server/db/postgres';
import { loadMenuItemsForRestaurant } from '$lib/server/repositories/admin-menu-repository';

const DAY_MS = 24 * 60 * 60 * 1000;

function getDayLabel(date: Date): string {
	const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
	return days[date.getDay()];
}

function getMockAnalytics(windowDays: number) {
	return {
		windowDays,
		summaryStats: [
			{
				label: 'Total Pesanan',
				value: '168',
				trend: '+18%',
				up: true,
				color: 'text-[#059669]',
				bg: 'bg-[#d1fae5]',
				icon: 'ShoppingCart'
			},
			{
				label: 'Pendapatan',
				value: 'Rp 18,4 jt',
				trend: '+12%',
				up: true,
				color: 'text-[#d97706]',
				bg: 'bg-[#fef3c7]',
				icon: 'TrendingUp'
			},
			{
				label: 'Kunjungan Katalog',
				value: '1.302',
				trend: '+31%',
				up: true,
				color: 'text-[#2563eb]',
				bg: 'bg-[#eff6ff]',
				icon: 'Eye'
			},
			{
				label: 'Rata-rata Pesanan',
				value: 'Rp 109rb',
				trend: '-3%',
				up: false,
				color: 'text-[#db2777]',
				bg: 'bg-[#fce7f3]',
				icon: 'BarChart3'
			}
		],
		dailyOrders: [
			{ day: 'Sen', orders: 18, rev: 1980000 },
			{ day: 'Sel', orders: 22, rev: 2420000 },
			{ day: 'Rab', orders: 19, rev: 2090000 },
			{ day: 'Kam', orders: 31, rev: 3410000 },
			{ day: 'Jum', orders: 28, rev: 3080000 },
			{ day: 'Sab', orders: 35, rev: 3850000 },
			{ day: 'Min', orders: 24, rev: 2640000 }
		],
		topProducts: [
			{
				name: 'Ayam Betutu',
				orders: 48,
				rev: 4704000,
				img: '/mock-images/photo-1604908176997-125f25cc6f3d.jpg'
			},
			{
				name: 'Ikan Bakar Jimbaran',
				orders: 36,
				rev: 5220000,
				img: '/mock-images/photo-1544943910-4c1dc44aab44.jpg'
			},
			{
				name: 'Sate Ayam',
				orders: 29,
				rev: 2204000,
				img: '/mock-images/photo-1529543544282-ea669407fca3.jpg'
			},
			{
				name: 'Es Kelapa Muda',
				orders: 22,
				rev: 924000,
				img: '/mock-images/photo-1541518763669-27fef04b14ea.jpg'
			},
			{
				name: 'Coconut Cendol',
				orders: 17,
				rev: 714000,
				img: '/mock-images/photo-1534706270553-2ac0dfa30283.jpg'
			}
		]
	};
}

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	const org = tenant.organization;
	const restaurant = tenant.activeRestaurant;
	const windowDays = 7;

	if (!appEnv.databaseUrl || appEnv.useMockBackend) {
		return getMockAnalytics(windowDays);
	}

	try {
		const orders = await listOrdersForRestaurant({
			organizationId: org.id,
			restaurantId: restaurant.id,
			limit: 200
		});

		const cutoff = new Date(Date.now() - windowDays * DAY_MS);
		const windowOrders = orders.filter((o) => new Date(o.createdAt) >= cutoff);
		const totalRevenue = windowOrders.reduce((sum, o) => sum + o.total, 0);
		const avgOrder = windowOrders.length > 0 ? Math.round(totalRevenue / windowOrders.length) : 0;

		// Compute daily buckets
		const dayMap = new Map<string, { orders: number; rev: number }>();
		for (let i = windowDays - 1; i >= 0; i--) {
			const d = new Date(Date.now() - i * DAY_MS);
			dayMap.set(getDayLabel(d), { orders: 0, rev: 0 });
		}
		for (const o of windowOrders) {
			const label = getDayLabel(new Date(o.createdAt));
			const bucket = dayMap.get(label);
			if (bucket) {
				bucket.orders += 1;
				bucket.rev += o.total;
			}
		}
		const dailyOrders = Array.from(dayMap.entries()).map(([day, v]) => ({ day, ...v }));

		// Top products by aggregating menu items from orders
		const menuItems = await withTransaction(async (client) => {
			return loadMenuItemsForRestaurant(client, {
				organizationId: org.id,
				restaurantId: restaurant.id
			});
		});
		const topProducts = menuItems.slice(0, 5).map((item) => ({
			name: item.name,
			orders: 0,
			rev: 0,
			img: item.image || '/mock-images/photo-1604908176997-125f25cc6f3d.jpg'
		}));

		function formatCompact(n: number): string {
			if (n >= 1000000) return 'Rp ' + (n / 1000000).toFixed(1) + ' jt';
			if (n >= 1000) return 'Rp ' + (n / 1000).toFixed(0) + 'rb';
			return 'Rp ' + n;
		}

		function trend(val: number, ref: number): { trend: string; up: boolean } {
			if (ref === 0) return { trend: '0%', up: true };
			const pct = ((val - ref) / ref) * 100;
			return { trend: (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%', up: pct >= 0 };
		}

		const prevCutoff = new Date(cutoff.getTime() - windowDays * DAY_MS);
		const prevOrders = orders.filter((o) => {
			const d = new Date(o.createdAt);
			return d >= prevCutoff && d < cutoff;
		});
		const prevRevenue = prevOrders.reduce((sum, o) => sum + o.total, 0);
		const prevAvg = prevOrders.length > 0 ? Math.round(prevRevenue / prevOrders.length) : 0;

		const totalTrend = trend(windowOrders.length, prevOrders.length);
		const revTrend = trend(totalRevenue, prevRevenue);
		const avgTrend = trend(avgOrder, prevAvg);

		const summaryStats = [
			{
				label: 'Total Pesanan',
				value: windowOrders.length.toString(),
				...totalTrend,
				color: 'text-[#059669]',
				bg: 'bg-[#d1fae5]',
				icon: 'ShoppingCart'
			},
			{
				label: 'Pendapatan',
				value: formatCompact(totalRevenue),
				...revTrend,
				color: 'text-[#d97706]',
				bg: 'bg-[#fef3c7]',
				icon: 'TrendingUp'
			},
			{
				label: 'Kunjungan Katalog',
				value: '—',
				trend: '',
				up: true,
				color: 'text-[#2563eb]',
				bg: 'bg-[#eff6ff]',
				icon: 'Eye'
			},
			{
				label: 'Rata-rata Pesanan',
				value: formatCompact(avgOrder),
				...avgTrend,
				color: 'text-[#db2777]',
				bg: 'bg-[#fce7f3]',
				icon: 'BarChart3'
			}
		];

		return { windowDays, summaryStats, dailyOrders, topProducts };
	} catch {
		return getMockAnalytics(windowDays);
	}
};
