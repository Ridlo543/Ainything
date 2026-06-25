import type { PageServerLoad } from './$types';
import { appEnv } from '$lib/server/config/env';
import { withTransaction } from '$lib/server/db/postgres';
import { loadMenuItemsForRestaurant } from '$lib/server/repositories/admin-menu-repository';

interface Category {
	id: string;
	name: string;
	description: string;
	productCount: number;
	color: string;
}

const colors = ['#059669', '#2563eb', '#d97706', '#db2777', '#7c3aed', '#dc2626'];

function getMockCategories(): Category[] {
	return [
		{ id: '1', name: 'Signatures', description: 'Menu andalan restoran', productCount: 3, color: '#059669' },
		{ id: '2', name: 'Drinks', description: 'Minuman segar', productCount: 2, color: '#2563eb' },
		{ id: '3', name: 'Satay', description: 'Berbagai sate pilihan', productCount: 2, color: '#d97706' },
		{ id: '4', name: 'Seafood', description: 'Ikan dan hasil laut segar', productCount: 1, color: '#db2777' },
	];
}

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	const org = tenant.organization;
	const restaurant = tenant.activeRestaurant;

	if (!appEnv.databaseUrl || appEnv.useMockBackend) {
		return { categories: getMockCategories() };
	}

	try {
		const menuItems = await withTransaction(async (client) => {
			return loadMenuItemsForRestaurant(client, {
				organizationId: org.id,
				restaurantId: restaurant.id
			});
		});

		const categoryMap = new Map<string, { count: number; color: string }>();
		let colorIdx = 0;
		for (const item of menuItems) {
			const catName = item.category || 'Uncategorized';
			if (!categoryMap.has(catName)) {
				categoryMap.set(catName, { count: 0, color: colors[colorIdx % colors.length] });
				colorIdx++;
			}
			categoryMap.get(catName)!.count++;
		}

		const categories: Category[] = Array.from(categoryMap.entries()).map(([name, info], i) => ({
			id: String(i + 1),
			name,
			description: '',
			productCount: info.count,
			color: info.color
		}));

		return { categories };
	} catch {
		return { categories: getMockCategories() };
	}
};
