import type {
	Allergen,
	DietaryFlag,
	LanguageTag,
	MenuImportIssue,
	MenuItem,
	MenuSourceType,
	Restaurant
} from '$lib/domain/menu/types';
import type { DatabaseClient } from '$lib/server/db/postgres';

export type RestaurantRow = {
	id: string;
	organization_id: string;
	name: string;
	slug: string;
	public_host: string;
	location: string;
	segment: Restaurant['segment'];
	language_tags: LanguageTag[];
	hero_image_url: string;
	menu_scan_url: string;
	table_count: number;
	menu_source_type: MenuSourceType;
	description: string;
	knowledge_highlights: string[];
	analytics: Restaurant['analytics'];
};

type MenuItemRow = {
	id: string;
	restaurant_id: string;
	category: string;
	name: string;
	local_name: string | null;
	description: string;
	price_amount: number;
	currency: MenuItem['currency'];
	image_url: string;
	spice_level: MenuItem['spiceLevel'];
	is_available: boolean;
	is_signature: boolean;
	confidence: MenuItem['confidence'];
	good_for: string[];
	dietary_flags: DietaryFlag[];
	allergens: Allergen[];
};

type ImportIssueRow = {
	id: string;
	restaurant_id: string;
	source_type: MenuSourceType;
	label: string;
	confidence: string;
	issue: string;
	status: MenuImportIssue['status'];
};

export function mapRestaurantRow(
	restaurant: RestaurantRow,
	categories: string[],
	menuItems: MenuItem[],
	importIssues: MenuImportIssue[] = []
): Restaurant {
	return {
		id: restaurant.id,
		organizationId: restaurant.organization_id,
		name: restaurant.name,
		slug: restaurant.slug,
		publicHost: restaurant.public_host,
		location: restaurant.location,
		segment: restaurant.segment,
		languages: restaurant.language_tags,
		heroImage: restaurant.hero_image_url,
		menuScan: restaurant.menu_scan_url,
		tableCount: restaurant.table_count,
		menuSourceType: restaurant.menu_source_type,
		description: restaurant.description,
		knowledgeHighlights: restaurant.knowledge_highlights,
		categories,
		menuItems,
		importIssues,
		analytics: restaurant.analytics
	};
}

export async function loadPublishedCategories(client: DatabaseClient, restaurantIds: string[]) {
	if (restaurantIds.length === 0) {
		return new Map<string, string[]>();
	}

	const result = await client.query<{ restaurant_id: string; name: string }>(
		`
			SELECT DISTINCT mc.restaurant_id::text, mc.name, mc.sort_order
			FROM menu_categories mc
			JOIN menus m ON m.id = mc.menu_id
			WHERE mc.restaurant_id = ANY($1::uuid[])
				AND m.status = 'published'
			ORDER BY mc.restaurant_id::text, mc.sort_order, mc.name
		`,
		[restaurantIds]
	);

	const categories = new Map<string, string[]>();

	for (const row of result.rows) {
		categories.set(row.restaurant_id, [...(categories.get(row.restaurant_id) ?? []), row.name]);
	}

	return categories;
}

export async function loadPublishedMenuItems(client: DatabaseClient, restaurantIds: string[]) {
	if (restaurantIds.length === 0) {
		return new Map<string, MenuItem[]>();
	}

	const result = await client.query<MenuItemRow>(
		`
			SELECT
				mi.id::text,
				mi.restaurant_id::text,
				mc.name AS category,
				mi.name,
				mi.local_name,
				mi.description,
				mi.price_amount,
				mi.currency,
				mi.image_url,
				mi.spice_level,
				mi.is_available,
				mi.is_signature,
				mi.confidence,
				COALESCE(mi.source_metadata->'goodFor', '[]'::jsonb) AS good_for,
				COALESCE(
					ARRAY_AGG(DISTINCT midf.flag_code) FILTER (WHERE midf.flag_code IS NOT NULL),
					ARRAY[]::text[]
				) AS dietary_flags,
				COALESCE(
					ARRAY_AGG(DISTINCT mia.allergen_code) FILTER (WHERE mia.allergen_code IS NOT NULL),
					ARRAY[]::text[]
				) AS allergens
			FROM menu_items mi
			JOIN menus m ON m.id = mi.menu_id
			JOIN menu_categories mc ON mc.id = mi.category_id
			LEFT JOIN menu_item_dietary_flags midf ON midf.menu_item_id = mi.id
			LEFT JOIN menu_item_allergens mia ON mia.menu_item_id = mi.id
			WHERE mi.restaurant_id = ANY($1::uuid[])
				AND m.status = 'published'
			GROUP BY mi.id, mc.name
			ORDER BY mi.restaurant_id::text, mi.sort_order, mi.name
		`,
		[restaurantIds]
	);

	const items = new Map<string, MenuItem[]>();

	for (const row of result.rows) {
		const item: MenuItem = {
			id: row.id,
			category: row.category,
			name: row.name,
			localName: row.local_name ?? undefined,
			description: row.description,
			price: row.price_amount,
			currency: row.currency,
			image: row.image_url,
			spiceLevel: row.spice_level,
			isAvailable: row.is_available,
			isSignature: row.is_signature,
			dietaryFlags: row.dietary_flags,
			allergens: row.allergens,
			goodFor: row.good_for,
			confidence: row.confidence
		};

		items.set(row.restaurant_id, [...(items.get(row.restaurant_id) ?? []), item]);
	}

	return items;
}

export async function loadImportIssues(client: DatabaseClient, restaurantIds: string[]) {
	if (restaurantIds.length === 0) {
		return new Map<string, MenuImportIssue[]>();
	}

	const result = await client.query<ImportIssueRow>(
		`
			SELECT
				id::text,
				restaurant_id::text,
				source_type,
				label,
				confidence::text,
				issue,
				status
			FROM menu_import_issues
			WHERE restaurant_id = ANY($1::uuid[])
			ORDER BY created_at DESC
		`,
		[restaurantIds]
	);

	const issues = new Map<string, MenuImportIssue[]>();

	for (const row of result.rows) {
		const issue: MenuImportIssue = {
			id: row.id,
			sourceType: row.source_type,
			label: row.label,
			confidence: Number(row.confidence),
			issue: row.issue,
			status: row.status
		};

		issues.set(row.restaurant_id, [...(issues.get(row.restaurant_id) ?? []), issue]);
	}

	return issues;
}
