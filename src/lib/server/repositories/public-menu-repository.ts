import type { PublicMenuBootstrap, RestaurantTable } from '$lib/domain/menu/types';
import {
	query,
	withTransaction,
	withPublicSessionContext,
	type DatabaseClient
} from '$lib/server/db/postgres';
import {
	loadPublishedCategories,
	loadPublishedMenuItems,
	mapRestaurantRow,
	type RestaurantRow
} from '$lib/server/repositories/menu-row-mapper';

type TableRow = {
	id: string;
	organization_id: string;
	restaurant_id: string;
	code: string;
	label: string;
};

type BootstrapRow = RestaurantRow & {
	table_id: string;
	table_organization_id: string;
	table_restaurant_id: string;
	table_code: string;
	table_label: string;
};

type CreateSessionInput = {
	organizationId: string;
	restaurantId: string;
	tableId: string;
	languageTag: string;
	preferences: Record<string, unknown>;
};

type CreateFallbackInput = {
	organizationId: string;
	restaurantId: string;
	tableId: string;
	sessionId?: string;
	languageTag: string;
	guestNeed: string;
	summary: string;
	priority: 'normal' | 'high';
};

type CreateFeedbackInput = {
	organizationId: string;
	restaurantId: string;
	sessionId?: string;
	helpful?: boolean;
	issueType?: string;
	comment?: string;
};

export async function resolvePublicMenuBootstrap(
	restaurantSlug: string,
	tableCode: string
): Promise<PublicMenuBootstrap | null> {
	const base = await query<BootstrapRow>(
		`
			SELECT
				r.id::text,
				r.organization_id::text,
				r.name,
				r.slug,
				COALESCE(r.public_host, '') AS public_host,
				r.location,
				r.segment,
				r.language_tags,
				r.hero_image_url,
				r.menu_scan_url,
				r.table_count,
				r.menu_source_type,
				r.description,
				r.knowledge_highlights,
				COALESCE(r.analytics, '{}'::jsonb) AS analytics,
				t.id::text AS table_id,
				t.organization_id::text AS table_organization_id,
				t.restaurant_id::text AS table_restaurant_id,
				t.code AS table_code,
				t.label AS table_label
			FROM restaurants r
			JOIN restaurant_tables t ON t.restaurant_id = r.id
			WHERE r.slug = $1
				AND r.status = 'active'
				AND t.code = $2
				AND t.is_active = true
			LIMIT 1
		`,
		[restaurantSlug, tableCode]
	);

	const row = base.rows[0];

	if (!row) {
		return null;
	}

	const [categoriesByRestaurant, itemsByRestaurant] = await Promise.all([
		loadPublishedCategories({ query }, [row.id]),
		loadPublishedMenuItems({ query }, [row.id])
	]);

	const restaurant = mapRestaurantRow(
		row,
		categoriesByRestaurant.get(row.id) ?? [],
		itemsByRestaurant.get(row.id) ?? []
	);

	if (restaurant.menuItems.length === 0) {
		return null;
	}

	return {
		restaurant,
		table: {
			id: row.table_id,
			code: row.table_code,
			label: row.table_label,
			restaurantId: row.table_restaurant_id,
			organizationId: row.table_organization_id,
			isActive: true,
			qrPath: ''
		}
	};
}

export async function findActiveTableByRestaurantSlug(
	restaurantSlug: string,
	tableCode: string
): Promise<RestaurantTable | null> {
	const result = await query<TableRow>(
		`
			SELECT
				t.id::text,
				t.organization_id::text,
				t.restaurant_id::text,
				t.code,
				t.label
			FROM restaurant_tables t
			JOIN restaurants r ON r.id = t.restaurant_id
			WHERE r.slug = $1
				AND r.status = 'active'
				AND t.code = $2
				AND t.is_active = true
			LIMIT 1
		`,
		[restaurantSlug, tableCode]
	);

	const row = result.rows[0];

	if (!row) {
		return null;
	}

	return {
		id: row.id,
		code: row.code,
		label: row.label,
		restaurantId: row.restaurant_id,
		organizationId: row.organization_id,
		isActive: true,
		qrPath: ''
	};
}

export async function createCustomerSession(input: CreateSessionInput) {
	const id = crypto.randomUUID();

	await query(
		`
			INSERT INTO customer_sessions (
				id,
				organization_id,
				restaurant_id,
				table_id,
				language_tag,
				preferences
			)
			VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6::jsonb)
		`,
		[
			id,
			input.organizationId,
			input.restaurantId,
			input.tableId,
			input.languageTag,
			JSON.stringify(input.preferences)
		]
	);

	return { id };
}

export async function createFallbackRequest(input: CreateFallbackInput) {
	const runInsert = async (client: DatabaseClient) => {
		const result = await client.query<{ id: string; status: string }>(
			`
				INSERT INTO fallback_requests (
					organization_id,
					restaurant_id,
					session_id,
					table_id,
					status,
					priority,
					language_tag,
					guest_need,
					summary
				)
				VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'new', $5, $6, $7, $8)
				RETURNING id::text, status
			`,
			[
				input.organizationId,
				input.restaurantId,
				input.sessionId ?? null,
				input.tableId,
				input.priority,
				input.languageTag,
				input.guestNeed,
				input.summary
			]
		);

		return result.rows[0];
	};

	// When a session id is present set app.public_session_id inside the transaction
	// so the hardened RLS policy (0004) can verify ownership at the DB layer.
	if (input.sessionId) {
		return withPublicSessionContext(input.sessionId, runInsert);
	}

	return withTransaction(runInsert);
}

export async function createFeedback(input: CreateFeedbackInput) {
	const runInsert = async (client: DatabaseClient) => {
		const result = await client.query<{ id: string }>(
			`
				INSERT INTO feedback (
					organization_id,
					restaurant_id,
					session_id,
					helpful,
					issue_type,
					comment
				)
				VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
				RETURNING id::text
			`,
			[
				input.organizationId,
				input.restaurantId,
				input.sessionId ?? null,
				input.helpful ?? null,
				input.issueType ?? null,
				input.comment ?? null
			]
		);

		return result.rows[0];
	};

	if (input.sessionId) {
		return withPublicSessionContext(input.sessionId, runInsert);
	}

	return withTransaction(runInsert);
}
