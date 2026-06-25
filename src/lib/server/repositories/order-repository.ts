import type { DatabaseClient } from '$lib/server/db/postgres';
import { getPool, withUserContext } from '$lib/server/db/postgres';
import type { Order, OrderItem, OrderStatus, OrderWithItems } from '$lib/domain/order/types';

type OrderRow = {
	id: string;
	organization_id: string;
	restaurant_id: string;
	session_id: string | null;
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
};

type OrderItemRow = {
	id: string;
	order_id: string;
	menu_item_id: string | null;
	name: string;
	quantity: number;
	price: number;
	notes: string | null;
};

function mapOrderRow(row: OrderRow): Order {
	return {
		id: row.id,
		organizationId: row.organization_id,
		restaurantId: row.restaurant_id,
		sessionId: row.session_id,
		tableId: row.table_id,
		tableCode: row.table_code,
		customerName: row.customer_name,
		status: row.status as OrderStatus,
		total: row.total,
		itemCount: row.item_count,
		notes: row.notes,
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString(),
		completedAt: row.completed_at?.toISOString() ?? null
	};
}

function mapOrderItemRow(row: OrderItemRow): OrderItem {
	return {
		id: row.id,
		orderId: row.order_id,
		menuItemId: row.menu_item_id,
		name: row.name,
		quantity: row.quantity,
		price: row.price,
		notes: row.notes
	};
}

export async function listOrdersForRestaurant(params: {
	organizationId: string;
	restaurantId: string;
	statuses?: OrderStatus[];
	limit?: number;
}): Promise<Order[]> {
	const { organizationId, restaurantId, statuses, limit = 50 } = params;

	const conditions = [
		'o.organization_id = $1',
		'o.restaurant_id = $2'
	];
	const values: (string | string[] | number)[] = [organizationId, restaurantId];
	let paramIdx = 3;

	if (statuses && statuses.length > 0) {
		conditions.push(`o.status = ANY($${paramIdx})`);
		values.push(statuses);
		paramIdx++;
	}

	values.push(limit);

	const sql = `
		SELECT o.id, o.organization_id, o.restaurant_id, o.session_id,
			o.table_id, rt.code AS table_code, o.customer_name,
			o.status, o.total, o.item_count, o.notes,
			o.created_at, o.updated_at, o.completed_at
		FROM orders o
		LEFT JOIN restaurant_tables rt ON rt.id = o.table_id
		WHERE ${conditions.join(' AND ')}
		ORDER BY o.created_at DESC
		LIMIT $${paramIdx}
	`;

	const result = await getPool().query<OrderRow>(sql, values);
	return result.rows.map(mapOrderRow);
}

export async function findOrderById(
	client: DatabaseClient,
	params: { organizationId: string; restaurantId: string; orderId: string }
): Promise<OrderWithItems | null> {
	const orderResult = await client.query<OrderRow>(
		`SELECT o.id, o.organization_id, o.restaurant_id, o.session_id,
			o.table_id, rt.code AS table_code, o.customer_name,
			o.status, o.total, o.item_count, o.notes,
			o.created_at, o.updated_at, o.completed_at
		FROM orders o
		LEFT JOIN restaurant_tables rt ON rt.id = o.table_id
		WHERE o.id = $1 AND o.organization_id = $2 AND o.restaurant_id = $3`,
		[params.orderId, params.organizationId, params.restaurantId]
	);

	if (orderResult.rows.length === 0) return null;

	const itemsResult = await client.query<OrderItemRow>(
		`SELECT id, order_id, menu_item_id, name, quantity, price, notes
		FROM order_items
		WHERE order_id = $1 AND organization_id = $2
		ORDER BY created_at`,
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
		restaurantId: string;
		sessionId?: string | null;
		tableId?: string | null;
		customerName?: string | null;
		notes?: string | null;
		items: {
			menuItemId?: string | null;
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
		`INSERT INTO orders (organization_id, restaurant_id, session_id, table_id, customer_name, total, item_count, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, organization_id, restaurant_id, session_id, table_id,
			NULL::text AS table_code, customer_name, status, total, item_count, notes,
			created_at, updated_at, completed_at`,
		[
			params.organizationId,
			params.restaurantId,
			params.sessionId ?? null,
			params.tableId ?? null,
			params.customerName ?? null,
			total,
			itemCount,
			params.notes ?? null
		]
	);

	const order = orderResult.rows[0];

	const itemValues: (string | number | null)[] = [];
	const itemPlaceholders = params.items.map((item, i) => {
		const base = i * 6;
		itemValues.push(
			order.id,
			params.organizationId,
			params.restaurantId,
			item.menuItemId ?? null,
			item.name,
			item.quantity
		);
		itemValues.push(item.price, item.notes ?? null);
		return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
	});

	const itemsResult = await client.query<OrderItemRow>(
		`INSERT INTO order_items (order_id, organization_id, restaurant_id, menu_item_id, name, quantity, price, notes)
		VALUES ${itemPlaceholders.join(', ')}
		RETURNING id, order_id, menu_item_id, name, quantity, price, notes`,
		itemValues
	);

	return {
		...mapOrderRow(order),
		items: itemsResult.rows.map(mapOrderItemRow)
	};
}

export async function updateOrderStatus(
	params: {
		userId: string;
		organizationId: string;
		restaurantId: string;
		orderId: string;
		newStatus: OrderStatus;
	}
): Promise<Order | null> {
	return withUserContext(params.userId, async (client) => {
		const completedAt =
			params.newStatus === 'completed' || params.newStatus === 'cancelled'
				? 'now()'
				: 'completed_at';

		const result = await client.query<OrderRow>(
			`UPDATE orders
			SET status = $1, updated_at = now(), completed_at = ${completedAt}
			WHERE id = $2 AND organization_id = $3 AND restaurant_id = $4
			RETURNING id, organization_id, restaurant_id, session_id, table_id,
				NULL::text AS table_code, customer_name, status, total, item_count, notes,
				created_at, updated_at, completed_at`,
			[params.newStatus, params.orderId, params.organizationId, params.restaurantId]
		);

		return result.rows.length > 0 ? mapOrderRow(result.rows[0]) : null;
	});
}
