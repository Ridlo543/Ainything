import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { withTransaction } from '$lib/server/db/postgres';
import { insertOrder } from '$lib/server/repositories/order-repository';
import { z } from 'zod';

const cartItemSchema = z.object({
	itemId: z.string(),
	name: z.string(),
	price: z.number().nonnegative(),
	qty: z.number().int().positive(),
	note: z.string().optional()
});

const orderSchema = z.object({
	items: z
		.string()
		.transform((val) => JSON.parse(val))
		.pipe(z.array(cartItemSchema).min(1).max(50)),
	customerName: z.string().trim().max(100).optional(),
	total: z
		.string()
		.transform(Number)
		.refine((n) => Number.isFinite(n) && n >= 0, 'Invalid total')
});

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const formData = await request.formData();
		const parsed = orderSchema.safeParse({
			items: formData.get('items'),
			customerName: formData.get('customerName') || undefined,
			total: formData.get('total')
		});

		if (!parsed.success) {
			return fail(400, {
				error: 'Invalid cart data. Please try again.'
			});
		}

		const { items, customerName } = parsed.data;

		const slug = params.slug;
		const { resolvePublicCatalog } = await import('$lib/server/tenant/public-context');
		const restaurant = await resolvePublicCatalog(slug);

		if (!restaurant) {
			return fail(404, { error: 'Restaurant not found.' });
		}

		try {
			const order = await withTransaction(async (client) => {
				return insertOrder(client, {
					organizationId: restaurant.organizationId,
					restaurantId: restaurant.id,
					customerName: customerName || null,
					items: items.map((i) => ({
						menuItemId: i.itemId || null,
						name: i.name,
						quantity: i.qty,
						price: i.price,
						notes: i.note || null
					}))
				});
			});

			return {
				success: true,
				orderId: order.id
			};
		} catch (err) {
			console.error('Order submission failed:', err);
			return fail(500, {
				error: 'Failed to place your order. Please try again or notify staff.'
			});
		}
	}
};
