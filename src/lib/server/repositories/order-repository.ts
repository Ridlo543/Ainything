import type { DatabaseClient } from '$lib/server/db/postgres';
import { getPool, withUserContext } from '$lib/server/db/postgres';
import type { Order, OrderItem, OrderStatus, OrderWithItems } from '$lib/domain/order/types';

type OrderRow = {
	id: string;
	organization_id: string;
	outlet_id: string;
	buyer_session_id: string | null;
	table_id: string | null;
	table_code: string | null;
	customer_name: string | null;
	status: string;
	total: number;
	item_count: number;
	notes: string | null;
	created_at: Date;
	updated_at: Date;
	completed_at: Date | null;
	/** Added in migration 0016 */
	order_number: number;
	// Payment/WA fields added in migration 0015
	buyer_whatsapp: string | null;
	payment_proof_url: string | null;
	payment_confirmed_at: Date | null;
	payment_confirmed_by: string | null;
	payment_rejected_at: Date | null;
	payment_rejected_by: string | null;
	payment_notes: string | null;
};

type OrderItemRow = {
	id: string;
	order_id: string;
	product_id: string | null;
	name: string;
	quantity: number;
	price: number;
	notes: string | null;
};

function mapOrderRow(row: OrderRow): Order {
	return {
		id: row.id,
		organizationId: row.organization_id,
		outletId: row.outlet_id,
		buyerSessionId: row.buyer_session_id,
		tableId: row.table_id,
		tableCode: row.table_code,
		customerName: row.customer_name,
		status: row.status as OrderStatus,
		total: row.total,
		itemCount: row.item_count,
		notes: row.notes,
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString(),
		completedAt: row.completed_at?.toISOString() ?? null,
		orderNumber: row.order_number,
		buyerWhatsapp: row.buyer_whatsapp ?? null,
		paymentProofUrl: row.payment_proof_url ?? null,
		paymentConfirmedAt: row.payment_confirmed_at?.toISOString() ?? null,
		paymentConfirmedBy: row.payment_confirmed_by ?? null,
		paymentRejectedAt: row.payment_rejected_at?.toISOString() ?? null,
		paymentRejectedBy: row.payment_rejected_by ?? null,
		paymentNotes: row.payment_notes ?? null
	};
}

function mapOrderItemRow(row: OrderItemRow): OrderItem {
	return {
		id: row.id,
		orderId: row.order_id,
		productId: row.product_id,
		name: row.name,
		quantity: row.quantity,
		price: row.price,
		notes: row.notes
	};
}

export async function listOrdersForOutlet(params: {
	organizationId: string;
	outletId: string;
	statuses?: OrderStatus[];
	limit?: number;
}): Promise<Order[]> {
	const { organizationId, outletId, statuses, limit = 50 } = params;

	const conditions = ['o.organization_id = $1', 'o.outlet_id = $2'];
	const values: (string | string[] | number)[] = [organizationId, outletId];
	let paramIdx = 3;

	if (statuses && statuses.length > 0) {
		conditions.push(`o.status = ANY($${paramIdx})`);
		values.push(statuses);
		paramIdx++;
	}

	values.push(limit);

	const sql = `
		SELECT o.id, o.organization_id, o.outlet_id, o.buyer_session_id,
			o.table_id, ot.code AS table_code, o.customer_name,
			o.status, o.total, o.item_count, o.notes,
			o.created_at, o.updated_at, o.completed_at,
			o.order_number,
			o.buyer_whatsapp, o.payment_proof_url,
			o.payment_confirmed_at, o.payment_confirmed_by::text,
			o.payment_rejected_at, o.payment_rejected_by::text,
			o.payment_notes
		FROM orders o
		LEFT JOIN outlet_tables ot ON ot.id = o.table_id
		WHERE ${conditions.join(' AND ')}
		ORDER BY o.created_at DESC
		LIMIT $${paramIdx}
	`;

	const result = await getPool().query<OrderRow>(sql, values);
	return result.rows.map(mapOrderRow);
}

export async function findOrderById(
	client: DatabaseClient,
	params: { organizationId: string; outletId: string; orderId: string }
): Promise<OrderWithItems | null> {
	const orderResult = await client.query<OrderRow>(
		`SELECT o.id, o.organization_id, o.outlet_id, o.buyer_session_id,
			o.table_id, ot.code AS table_code, o.customer_name,
			o.status, o.total, o.item_count, o.notes,
			o.created_at, o.updated_at, o.completed_at,
			o.order_number,
			o.buyer_whatsapp, o.payment_proof_url,
			o.payment_confirmed_at, o.payment_confirmed_by::text,
			o.payment_rejected_at, o.payment_rejected_by::text,
			o.payment_notes
		FROM orders o
		LEFT JOIN outlet_tables ot ON ot.id = o.table_id
		WHERE o.id = $1 AND o.organization_id = $2 AND o.outlet_id = $3`,
		[params.orderId, params.organizationId, params.outletId]
	);

	if (orderResult.rows.length === 0) return null;

	const itemsResult = await client.query<OrderItemRow>(
		`SELECT id, order_id, product_id, name, quantity, price, notes
		FROM order_items
		WHERE order_id = $1 AND organization_id = $2
		ORDER BY id`,
		[params.orderId, params.organizationId]
	);

	return {
		...mapOrderRow(orderResult.rows[0]),
		items: itemsResult.rows.map(mapOrderItemRow)
	};
}

export async function insertOrder(
	client: DatabaseClient,
	params: {
		organizationId: string;
		outletId: string;
		buyerSessionId?: string | null;
		tableId?: string | null;
		customerName?: string | null;
		buyerWhatsapp?: string | null;
		notes?: string | null;
		items: {
			productId?: string | null;
			name: string;
			quantity: number;
			price: number;
			notes?: string | null;
		}[];
	}
): Promise<OrderWithItems> {
	const total = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const itemCount = params.items.reduce((sum, item) => sum + item.quantity, 0);

	const orderResult = await client.query<OrderRow>(
		`INSERT INTO orders (organization_id, outlet_id, buyer_session_id, table_id, customer_name, buyer_whatsapp, total, item_count, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING id, organization_id, outlet_id, buyer_session_id, table_id,
				NULL::text AS table_code, customer_name, status, total, item_count, notes,
				created_at, updated_at, completed_at,
				order_number,
				buyer_whatsapp, payment_proof_url,
				payment_confirmed_at, payment_confirmed_by::text,
				payment_rejected_at, payment_rejected_by::text,
				payment_notes`,
		[
			params.organizationId,
			params.outletId,
			params.buyerSessionId ?? null,
			params.tableId ?? null,
			params.customerName ?? null,
			params.buyerWhatsapp ?? null,
			total,
			itemCount,
			params.notes ?? null
		]
	);

	const order = orderResult.rows[0];

	const itemValues: (string | number | null)[] = [];
	const itemPlaceholders = params.items.map((item, i) => {
		const base = i * 8; // 8 values per item: order_id, org_id, outlet_id, product_id, name, qty, price, notes
		itemValues.push(
			order.id,
			params.organizationId,
			params.outletId,
			item.productId ?? null,
			item.name,
			item.quantity,
			item.price,
			item.notes ?? null
		);
		return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
	});

	const itemsResult = await client.query<OrderItemRow>(
		`INSERT INTO order_items (order_id, organization_id, outlet_id, product_id, name, quantity, price, notes)
		VALUES ${itemPlaceholders.join(', ')}
		RETURNING id, order_id, product_id, name, quantity, price, notes`,
		itemValues
	);

	return {
		...mapOrderRow(order),
		items: itemsResult.rows.map(mapOrderItemRow)
	};
}

type OrderWithItemsRow = OrderRow & {
	item_id: string | null;
	item_product_id: string | null;
	item_name: string | null;
	item_quantity: number | null;
	item_price: number | null;
	item_notes: string | null;
};

export async function listOrdersWithItems(params: {
	organizationId: string;
	outletId: string;
	statuses?: OrderStatus[];
	limit?: number;
}): Promise<OrderWithItems[]> {
	const { organizationId, outletId, statuses, limit = 50 } = params;

	const conditions = ['organization_id = $1', 'outlet_id = $2'];
	const values: (string | string[] | number)[] = [organizationId, outletId];
	let paramIdx = 3;

	if (statuses && statuses.length > 0) {
		conditions.push(`status = ANY($${paramIdx})`);
		values.push(statuses);
		paramIdx++;
	}

	values.push(limit);

	const sql = `
		SELECT
			o.id, o.organization_id, o.outlet_id, o.buyer_session_id,
			o.table_id, ot.code AS table_code, o.customer_name,
			o.status, o.total, o.item_count, o.notes,
			o.order_number, o.buyer_whatsapp,
			o.payment_proof_url, o.payment_confirmed_at,
			o.payment_confirmed_by::text,
			o.payment_rejected_at, o.payment_rejected_by::text,
			o.payment_notes,
			o.created_at, o.updated_at, o.completed_at,
			oi.id        AS item_id,
			oi.product_id AS item_product_id,
			oi.name      AS item_name,
			oi.quantity  AS item_quantity,
			oi.price     AS item_price,
			oi.notes     AS item_notes
		FROM (
			SELECT * FROM orders
			WHERE ${conditions.join(' AND ')}
			ORDER BY created_at DESC
			LIMIT $${paramIdx}
		) o
		LEFT JOIN outlet_tables ot ON ot.id = o.table_id
		LEFT JOIN order_items oi
			ON oi.order_id = o.id AND oi.organization_id = o.organization_id
		ORDER BY o.created_at DESC, oi.id
	`;

	const result = await getPool().query<OrderWithItemsRow>(sql, values);

	// Group rows by order id, preserving DESC order
	const orderMap = new Map<string, OrderWithItems>();
	for (const row of result.rows) {
		if (!orderMap.has(row.id)) {
			orderMap.set(row.id, { ...mapOrderRow(row), items: [] });
		}
		if (row.item_id !== null) {
			orderMap.get(row.id)!.items.push({
				id: row.item_id,
				orderId: row.id,
				productId: row.item_product_id,
				name: row.item_name!,
				quantity: row.item_quantity!,
				price: row.item_price!,
				notes: row.item_notes
			});
		}
	}

	return Array.from(orderMap.values());
}

type AnalyticsItemRow = {
	product_id: string | null;
	name: string;
	quantity: number;
	price: number;
	order_status: string;
	order_created_at: Date;
};

export type AnalyticsItem = {
	productId: string | null;
	name: string;
	quantity: number;
	price: number;
	orderStatus: string;
	orderCreatedAt: string;
};

/**
 * Fetches order items joined with their parent order status and timestamp,
 * scoped to a date range. Used exclusively by the analytics page.
 */
export async function listOrderItemsForAnalytics(params: {
	organizationId: string;
	outletId: string;
	from: Date;
	to: Date;
}): Promise<AnalyticsItem[]> {
	const { organizationId, outletId, from, to } = params;

	const sql = `
		SELECT
			oi.product_id,
			oi.name,
			oi.quantity,
			oi.price,
			o.status   AS order_status,
			o.created_at AS order_created_at
		FROM order_items oi
		JOIN orders o
			ON o.id = oi.order_id
			AND o.organization_id = oi.organization_id
		WHERE oi.organization_id = $1
		  AND oi.outlet_id       = $2
		  AND o.created_at      >= $3
		  AND o.created_at       < $4
		ORDER BY o.created_at DESC
	`;

	const result = await getPool().query<AnalyticsItemRow>(sql, [organizationId, outletId, from, to]);

	return result.rows.map((r) => ({
		productId: r.product_id,
		name: r.name,
		quantity: r.quantity,
		price: r.price,
		orderStatus: r.order_status,
		orderCreatedAt: r.order_created_at.toISOString()
	}));
}

export async function updateOrderStatus(params: {
	userId: string;
	organizationId: string;
	outletId: string;
	orderId: string;
	newStatus: OrderStatus;
}): Promise<Order | null> {
	return withUserContext(params.userId, async (client) => {
		// Only set completed_at on true completion — not on cancellation.
		// Cancellation uses a separate cancelled_at concept; preserving completed_at=null
		// allows analytics to correctly identify orders that never reached completion.
		const completedAt = params.newStatus === 'completed' ? 'now()' : 'completed_at';

		const result = await client.query<OrderRow>(
			`UPDATE orders
			SET status = $1, updated_at = now(), completed_at = ${completedAt}
			WHERE id = $2 AND organization_id = $3 AND outlet_id = $4
			RETURNING id, organization_id, outlet_id, buyer_session_id, table_id,
				NULL::text AS table_code, customer_name, status, total, item_count, notes,
				created_at, updated_at, completed_at,
				order_number,
				buyer_whatsapp, payment_proof_url,
				payment_confirmed_at, payment_confirmed_by::text,
				payment_rejected_at, payment_rejected_by::text,
				payment_notes`,
			[params.newStatus, params.orderId, params.organizationId, params.outletId]
		);

		return result.rows.length > 0 ? mapOrderRow(result.rows[0]) : null;
	});
}
