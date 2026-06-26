import type { PageServerLoad } from './$types';
import { withTransaction } from '$lib/server/db/postgres';
import { loadProductsForOutlet } from '$lib/server/repositories/admin-menu-repository';

interface Category {
	id: string;
	name: string;
	description: string;
	productCount: number;
	color: string;
}

const colors = ['#059669', '#2563eb', '#d97706', '#db2777', '#7c3aed', '#dc2626'];

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	const org = tenant.organization;
	const outlet = tenant.activeOutlet;

	try {
		const products = await withTransaction((client) =>
			loadProductsForOutlet(client, { outletId: outlet.id, organizationId: org.id })
		);

		const categoryMap = new Map<string, { count: number; color: string }>();
		let colorIdx = 0;
		for (const product of products) {
			const catName = product.section || 'Uncategorized';
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
	} catch (err) {
		console.error('[categories] Failed to load categories:', err);
		return { categories: [] };
	}
};
