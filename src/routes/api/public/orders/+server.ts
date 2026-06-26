import { json, error, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { query, withTransaction } from '$lib/server/db/postgres';
import { insertOrder } from '$lib/server/repositories/order-repository';
import { loadPublicOutletBySlug } from '$lib/server/repositories/public-catalog-repository';
import { applyRateLimit, checkBodySize } from '$lib/server/services/public-api-helpers';

/**
 * POST /api/public/orders
 *
 * JSON API endpoint for cart submission from PWA/mobile buyers.
 * Mirrors the behavior of the SvelteKit form action in (public)/r/[slug]/cart/+page.server.ts
 * but accepts JSON instead of FormData.
 *
 * Rate limit: 10 / 60 s per IP (order-create tier).
 *
 * Security model: price and name are ALWAYS fetched from the DB — client-supplied
 * values are ignored. Only itemId, quantity, and optional note are trusted from
 * the request body (see Technical_Specification "Anonymous Guest-Write Trust Model").
 */

const orderItemSchema = z.object({
	itemId: z.string().uuid('Invalid item ID'),
	qty: z.number().int().positive().max(99),
	note: z.string().max(200).optional()
});

const bodySchema = z.object({
	outletSlug: z.string().trim().min(1).max(120),
	items: z.array(orderItemSchema).min(1).max(50),
	customerName: z.string().trim().max(100).optional(),
	tableId: z.string().uuid().optional(),
	sessionId: z.string().uuid().optional()
});

type DbProduct = {
	id: string;
	name: string;
	price_amount: number;
	is_available: boolean;
};

export const POST: RequestHandler = async ({ request }) => {
	await applyRateLimit('order-create', request);
	checkBodySize(request, 256_000);

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		error(400, 'Invalid JSON body.');
	}

	const parsed = bodySchema.safeParse(raw);
	if (!parsed.success) {
		error(400, parsed.error.issues[0]?.message ?? 'Invalid request body.');
	}

	const { outletSlug, items, customerName, tableId, sessionId } = parsed.data;

	// Resolve outlet — never trust client-supplied outlet/org IDs.
	const outlet = await loadPublicOutletBySlug(outletSlug);
	if (!outlet) {
		error(404, 'Outlet not found or inactive.');
	}

	// Fetch canonical prices and availability from DB.
	const itemIds = items.map((i) => i.itemId);
	const dbResult = await query<DbProduct>(
		`SELECT id::text, name, price_amount, is_available
		 FROM products
		 WHERE id = ANY($1::uuid[])
		   AND outlet_id = $2::uuid`,
		[itemIds, outlet.id]
	);

	const dbProductMap = new Map(dbResult.rows.map((r) => [r.id, r]));

	// Validate every item exists and is available.
	for (const item of items) {
		const dbProduct = dbProductMap.get(item.itemId);
		if (!dbProduct) {
			error(400, `Item tidak ditemukan atau tidak tersedia.`);
		}
		if (!dbProduct.is_available) {
			error(400, `"${dbProduct.name}" sedang tidak tersedia.`);
		}
	}

	const order = await withTransaction((client) =>
		insertOrder(client, {
			organizationId: outlet.organizationId,
			outletId: outlet.id,
			buyerSessionId: sessionId ?? null,
			tableId: tableId ?? null,
			customerName: customerName ?? null,
			// Use server-authoritative price and name — never from the request body.
			items: items.map((i) => {
				const dbProduct = dbProductMap.get(i.itemId)!;
				return {
					productId: i.itemId,
					name: dbProduct.name,
					quantity: i.qty,
					price: dbProduct.price_amount,
					notes: i.note ?? null
				};
			})
		})
	);

	return json(
		{
			orderId: order.id,
			status: order.status,
			total: order.total,
			itemCount: order.itemCount
		},
		{ status: 201 }
	);
};
