import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { withDirectTransaction, query } from '$lib/server/db/postgres';
import { insertOrder } from '$lib/server/repositories/order-repository';
import { createBuyerSession } from '$lib/server/repositories/public-catalog-repository';
import { notifyBuyerOrderPlaced } from '$lib/server/services/order-notification-service';
import { z } from 'zod';

// Only accept itemId, quantity, and optional note from the client.
// Price and name are always fetched from the DB — never trusted from the client.
// itemId is validated for existence against the DB below — no UUID format check here
// because seeded IDs use a non-RFC-4122 format (version nibble = 0).
const cartItemSchema = z.object({
	itemId: z.string().min(1, 'Invalid item ID'),
	qty: z.number().int().positive().max(99),
	note: z.string().max(200).optional()
});

const orderSchema = z.object({
	items: z
		.string()
		.transform((val) => JSON.parse(val))
		.pipe(z.array(cartItemSchema).min(1).max(50)),
	customerName: z.string().trim().max(100).optional(),
	buyerWhatsapp: z
		.string()
		.trim()
		.max(20)
		.regex(/^\+?[0-9]{7,15}$/, 'Format WhatsApp tidak valid')
		.optional()
		.or(z.literal(''))
		.transform((v) => (v === '' ? undefined : v))
});

type DbProduct = {
	id: string;
	name: string;
	price_amount: number;
	is_available: boolean;
};

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug;
	const { resolvePublicCatalog } = await import('$lib/server/tenant/public-context');
	const outlet = await resolvePublicCatalog(slug);

	if (!outlet) return { checkoutMode: 'offline' as const, requireWhatsapp: false };

	return {
		checkoutMode: outlet.checkoutSettings.checkoutMode,
		requireWhatsapp: outlet.checkoutSettings.requireBuyerWhatsapp
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const formData = await request.formData();
		const parsed = orderSchema.safeParse({
			items: formData.get('items'),
			customerName: formData.get('customerName') || undefined,
			buyerWhatsapp: formData.get('buyerWhatsapp') || ''
		});

		if (!parsed.success) {
			const firstError = parsed.error.issues[0];
			return fail(400, {
				error: firstError?.message ?? 'Invalid cart data. Please try again.'
			});
		}

		const { items, customerName, buyerWhatsapp } = parsed.data;

		const slug = params.slug;
		const { resolvePublicCatalog } = await import('$lib/server/tenant/public-context');
		const outlet = await resolvePublicCatalog(slug);

		if (!outlet) {
			return fail(404, { error: 'Outlet tidak ditemukan.' });
		}

		// Enforce WA requirement server-side — client UI is not trusted.
		if (outlet.checkoutSettings.requireBuyerWhatsapp && !buyerWhatsapp) {
			return fail(400, { error: 'Nomor WhatsApp wajib diisi untuk outlet ini.' });
		}

		// Fetch canonical prices and availability from DB — never trust client-supplied values.
		const itemIds = items.map((i) => i.itemId);
		const dbResult = await query<DbProduct>(
			`SELECT id::text, name, price_amount, is_available
			 FROM products
			 WHERE id = ANY($1::uuid[])
			   AND outlet_id = $2::uuid`,
			[itemIds, outlet.id]
		);

		const dbItemMap = new Map(dbResult.rows.map((r) => [r.id, r]));

		// Validate all requested items exist and are available in this outlet.
		for (const item of items) {
			const dbItem = dbItemMap.get(item.itemId);
			if (!dbItem) {
				return fail(400, { error: `Item tidak ditemukan atau tidak tersedia.` });
			}
			if (!dbItem.is_available) {
				return fail(400, { error: `"${dbItem.name}" sedang tidak tersedia.` });
			}
		}

		// Resolve or create a buyer session so app.public_session_id GUC can be set.
		// The orders_outlet_insert RLS policy calls has_outlet_access(outlet_id), which
		// checks buyer_sessions.public_session_id = current_public_session_id(). Without
		// withPublicSessionContext the GUC is never set and every public INSERT into orders
		// fails with a row-level security violation.
		let sessionId = formData.get('buyerSessionId')?.toString() ?? null;
		if (!sessionId) {
			// Cart form doesn't include a session token — create a lightweight anonymous
			// session so the RLS policy passes. table_id is null for direct-link orders.
			const created = await createBuyerSession({
				organizationId: outlet.organizationId,
				outletId: outlet.id,
				tableId: null,
				languageTag: 'id',
				preferences: {}
			});
			sessionId = created?.id ?? null;
		}

		if (!sessionId) {
			return fail(500, { error: 'Gagal membuat sesi. Coba lagi.' });
		}

		const sid = sessionId;

		try {
			const order = await withDirectTransaction(async (client) => {
				if (buyerWhatsapp) {
					await client
						.query(
							`UPDATE buyer_sessions SET whatsapp = $1 WHERE id = $2::uuid AND outlet_id = $3::uuid`,
							[buyerWhatsapp, sid, outlet.id]
						)
						.catch(() => {
							// Non-critical — don't fail the order if session update fails.
						});
				}
				return insertOrder(client, {
					organizationId: outlet.organizationId,
					outletId: outlet.id,
					buyerSessionId: sid,
					customerName: customerName || null,
					buyerWhatsapp: buyerWhatsapp ?? null,
					// Use server-authoritative price and name from DB — never trust client values.
					items: items.map((i) => {
						const dbItem = dbItemMap.get(i.itemId)!;
						return {
							productId: i.itemId,
							name: dbItem.name,
							quantity: i.qty,
							price: dbItem.price_amount,
							notes: i.note || null
						};
					})
				});
			});

			// Fire-and-forget WA notification — never blocks the order response.
			if (buyerWhatsapp) {
				notifyBuyerOrderPlaced({
					buyerWhatsapp,
					outletName: outlet.name,
					orderNumber: `#${String(order.orderNumber).padStart(4, '0')}`,
					orderId: order.id,
					tableCode: order.tableCode,
					customerName: order.customerName,
					items: items.map((i) => {
						const dbItem = dbItemMap.get(i.itemId)!;
						return { name: dbItem.name, quantity: i.qty, price: dbItem.price_amount };
					}),
					total: order.total,
					checkoutMode: outlet.checkoutSettings.checkoutMode
				}).catch(() => {
					// Already handled inside the service — this is a safety net.
				});
			}

			return {
				success: true,
				orderId: order.id,
				orderNumber: order.orderNumber
			};
		} catch (err) {
			console.error('Order submission failed:', err);
			return fail(500, {
				error: 'Gagal mengirim pesanan. Coba lagi atau hubungi staf.'
			});
		}
	}
};
