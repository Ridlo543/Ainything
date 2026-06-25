import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { appEnv } from '$lib/server/config/env';
import { withTransaction } from '$lib/server/db/postgres';
import {
	loadMenuItemsForRestaurant,
	setMenuItemAvailability
} from '$lib/server/repositories/admin-menu-repository';
import { formatPrice } from '$lib/domain/menu/policy';
import type { MenuItem } from '$lib/domain/menu/types';

function toProduct(item: MenuItem) {
	return {
		id: item.id,
		name: item.name,
		category: item.category,
		price: item.price,
		status: item.isAvailable ? 'active' : 'hidden',
		img: item.image || '/mock-images/photo-1604908176997-125f25cc6f3d.jpg',
		orders: 0,
		description: item.description,
		spiceLevel: item.spiceLevel,
		dietaryFlags: item.dietaryFlags,
		allergens: item.allergens,
		isSignature: item.isSignature
	};
}

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	const org = tenant.organization;
	const restaurant = tenant.activeRestaurant;

	if (!appEnv.databaseUrl || appEnv.useMockBackend) {
		return {
			products: getMockProducts(),
			categories: ['Semua', ...restaurant.categories]
		};
	}

	try {
		const menuItems = await withTransaction(async (client) => {
			return loadMenuItemsForRestaurant(client, {
				organizationId: org.id,
				restaurantId: restaurant.id
			});
		});

		const products = menuItems.map(toProduct);
		const cats = [...new Set(menuItems.map((i) => i.category))].sort();
		return {
			products,
			categories: ['Semua', ...cats]
		};
	} catch (err) {
		console.error('[catalog] Failed to load menu items, falling back to mock:', err);
		return {
			products: getMockProducts(),
			categories: ['Semua', ...restaurant.categories]
		};
	}
};

export const actions: Actions = {
	toggleAvailability: async ({ request, locals }) => {
		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;
		const currentStatus = formData.get('currentStatus') as string;

		if (!itemId) return fail(400, { error: 'Missing item ID' });

		const user = locals.user;
		if (!user) return fail(401, { error: 'Not authenticated' });

		const tenantContext = await import('$lib/server/tenant/tenant-context').then((m) =>
			m.resolveTenantContext(user)
		);

		if (!appEnv.databaseUrl || appEnv.useMockBackend) {
			return { success: true, itemId, newStatus: currentStatus === 'active' ? 'hidden' : 'active' };
		}

		try {
			await withTransaction(async (client) => {
				return setMenuItemAvailability(client, {
					organizationId: tenantContext.organization.id,
					restaurantId: tenantContext.activeRestaurant.id,
					itemId,
					isAvailable: currentStatus !== 'active'
				});
			});
			return { success: true, itemId, newStatus: currentStatus === 'active' ? 'hidden' : 'active' };
		} catch (err) {
			console.error('[catalog] Toggle availability failed:', err);
			return fail(500, { error: 'Failed to update item availability' });
		}
	},

	delete: async ({ request, locals }) => {
		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;

		if (!itemId) return fail(400, { error: 'Missing item ID' });

		const user = locals.user;
		if (!user) return fail(401, { error: 'Not authenticated' });

		if (!appEnv.databaseUrl || appEnv.useMockBackend) {
			return { success: true, deletedId: itemId };
		}

		try {
			const tenantContext = await import('$lib/server/tenant/tenant-context').then((m) =>
				m.resolveTenantContext(user)
			);
			await withTransaction(async (client) => {
				await client.query(
					`DELETE FROM menu_items WHERE id = $1::uuid AND restaurant_id = $2::uuid AND organization_id = $3::uuid`,
					[itemId, tenantContext.activeRestaurant.id, tenantContext.organization.id]
				);
			});
			return { success: true, deletedId: itemId };
		} catch (err) {
			console.error('[catalog] Delete failed:', err);
			return fail(500, { error: 'Failed to delete item' });
		}
	}
};

function getMockProducts() {
	return [
		{
			id: '1',
			name: 'Slow Roasted Betutu Chicken',
			category: 'Signatures',
			price: 98000,
			status: 'active',
			img: '/mock-images/photo-1604908176997-125f25cc6f3d.jpg',
			orders: 48,
			description: '',
			spiceLevel: 3,
			dietaryFlags: ['halal'],
			allergens: [],
			isSignature: true
		},
		{
			id: '2',
			name: 'Jimbaran Grilled Fish',
			category: 'Signatures',
			price: 145000,
			status: 'active',
			img: '/mock-images/photo-1544943910-4c1dc44aab44.jpg',
			orders: 36,
			description: '',
			spiceLevel: 2,
			dietaryFlags: ['halal', 'gluten-free'],
			allergens: ['seafood'],
			isSignature: true
		},
		{
			id: '3',
			name: 'Young Coconut with Lime',
			category: 'Drinks',
			price: 42000,
			status: 'active',
			img: '/mock-images/photo-1541518763669-27fef04b14ea.jpg',
			orders: 22,
			description: '',
			spiceLevel: 0,
			dietaryFlags: ['halal', 'vegan'],
			allergens: [],
			isSignature: false
		},
		{
			id: '4',
			name: 'Chicken Satay Set',
			category: 'Satay',
			price: 76000,
			status: 'active',
			img: '/mock-images/photo-1529543544282-ea669407fca3.jpg',
			orders: 29,
			description: '',
			spiceLevel: 1,
			dietaryFlags: ['halal'],
			allergens: ['nuts'],
			isSignature: false
		},
		{
			id: '5',
			name: 'Lamb Satay with Sweet Soy',
			category: 'Satay',
			price: 98000,
			status: 'hidden',
			img: '/mock-images/photo-1555939594-58d7cb561ad1.jpg',
			orders: 14,
			description: '',
			spiceLevel: 2,
			dietaryFlags: ['halal'],
			allergens: ['nuts'],
			isSignature: false
		},
		{
			id: '6',
			name: 'Coconut Cendol',
			category: 'Drinks',
			price: 42000,
			status: 'active',
			img: '/mock-images/photo-1534706270553-2ac0dfa30283.jpg',
			orders: 17,
			description: '',
			spiceLevel: 0,
			dietaryFlags: ['halal', 'vegetarian'],
			allergens: [],
			isSignature: false
		},
		{
			id: '7',
			name: 'Grilled Sea Bass Tahini',
			category: 'Seafood',
			price: 165000,
			status: 'active',
			img: '/mock-images/photo-1519708227418-c8fd9a32b7a2.jpg',
			orders: 11,
			description: '',
			spiceLevel: 1,
			dietaryFlags: ['halal', 'gluten-free'],
			allergens: ['seafood', 'sesame'],
			isSignature: false
		},
		{
			id: '8',
			name: 'Nasi Goreng Spesial',
			category: 'Signatures',
			price: 65000,
			status: 'hidden',
			img: '/mock-images/photo-1512058564366-18510be2db19.jpg',
			orders: 8,
			description: '',
			spiceLevel: 2,
			dietaryFlags: ['halal'],
			allergens: ['egg'],
			isSignature: true
		}
	];
}
