import type { PublicMenuBootstrap, Restaurant, RestaurantTable } from '$lib/domain/menu/types';
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

// TableRow maps outlet_tables columns to the legacy RestaurantTable shape.
type TableRow = {
	id: string;
	organization_id: string;
	restaurant_id: string; // outlet_id aliased for compat
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
				o.id::text,
				o.organization_id::text,
				o.name,
				o.slug,
				COALESCE(o.public_host, '') AS public_host,
				COALESCE(o.location, '') AS location,
				COALESCE(o.business_type, 'other') AS segment,
				COALESCE(o.language_tags, ARRAY['id']) AS language_tags,
				COALESCE(o.hero_image_url, '') AS hero_image_url,
				COALESCE(o.catalog_scan_url, '') AS menu_scan_url,
				COALESCE(o.table_count, 0) AS table_count,
				COALESCE(o.catalog_source_type, 'photo') AS menu_source_type,
				COALESCE(o.description, '') AS description,
				COALESCE(o.knowledge_highlights, ARRAY[]::text[]) AS knowledge_highlights,
				COALESCE(o.analytics, '{}'::jsonb) AS analytics,
				t.id::text AS table_id,
				t.organization_id::text AS table_organization_id,
				t.outlet_id::text AS table_restaurant_id,
				t.code AS table_code,
				t.label AS table_label
			FROM outlets o
			JOIN outlet_tables t ON t.outlet_id = o.id
			WHERE o.slug = $1
				AND o.status = 'active'
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

	return {
		restaurant,
		table: {
			id: row.table_id,
			code: row.table_code,
			label: row.table_label,
			outletId: row.table_restaurant_id,
			organizationId: row.table_organization_id,
			isActive: true,
			qrPath: ''
		}
	};
}

export async function loadPublishedRestaurantBySlug(
	restaurantSlug: string
): Promise<Restaurant | null> {
	const base = await query<RestaurantRow>(
		`
			SELECT
				o.id::text,
				o.organization_id::text,
				o.name,
				o.slug,
				COALESCE(o.public_host, '') AS public_host,
				COALESCE(o.location, '') AS location,
				COALESCE(o.business_type, 'other') AS segment,
				COALESCE(o.language_tags, ARRAY['id']) AS language_tags,
				COALESCE(o.hero_image_url, '') AS hero_image_url,
				COALESCE(o.catalog_scan_url, '') AS menu_scan_url,
				COALESCE(o.table_count, 0) AS table_count,
				COALESCE(o.catalog_source_type, 'photo') AS menu_source_type,
				COALESCE(o.description, '') AS description,
				COALESCE(o.knowledge_highlights, ARRAY[]::text[]) AS knowledge_highlights,
				COALESCE(o.analytics, '{}'::jsonb) AS analytics
			FROM outlets o
			WHERE o.slug = $1
				AND o.status = 'active'
			LIMIT 1
		`,
		[restaurantSlug]
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

	return restaurant;
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
				t.outlet_id::text AS restaurant_id,
				t.code,
				t.label
			FROM outlet_tables t
			JOIN outlets o ON o.id = t.outlet_id
			WHERE o.slug = $1
				AND o.status = 'active'
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
		outletId: row.restaurant_id,
		organizationId: row.organization_id,
		isActive: true,
		qrPath: ''
	};
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
