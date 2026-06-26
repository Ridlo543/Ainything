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

	// Query catalog_sections (generalized schema). outletIds == restaurantIds (same UUIDs).
	const result = await client.query<{ outlet_id: string; name: string }>(
		`
			SELECT DISTINCT cs.outlet_id::text, cs.name, cs.sort_order
			FROM catalog_sections cs
			JOIN catalogs c ON c.id = cs.catalog_id
			WHERE cs.outlet_id = ANY($1::uuid[])
				AND c.status = 'published'
			ORDER BY cs.outlet_id::text, cs.sort_order, cs.name
		`,
		[restaurantIds]
	);

	const categories = new Map<string, string[]>();

	for (const row of result.rows) {
		categories.set(row.outlet_id, [...(categories.get(row.outlet_id) ?? []), row.name]);
	}

	return categories;
}

export async function loadPublishedMenuItems(client: DatabaseClient, restaurantIds: string[]) {
	if (restaurantIds.length === 0) {
		return new Map<string, MenuItem[]>();
	}

	// Query products joined with catalog_sections/catalogs (generalized schema).
	// outletIds == restaurantIds (same UUIDs).
	type ProductRow = {
		outlet_id: string;
		category: string;
		id: string;
		name: string;
		local_name: string | null;
		description: string;
		price_amount: number;
		currency: MenuItem['currency'];
		image_url: string;
		is_available: boolean;
		is_featured: boolean;
		confidence: MenuItem['confidence'];
	};

	const result = await client.query<ProductRow>(
		`
			SELECT
				p.outlet_id::text,
				cs.name AS category,
				p.id::text,
				p.name,
				p.local_name,
				COALESCE(p.description, '') AS description,
				p.price_amount,
				COALESCE(p.currency, 'IDR') AS currency,
				COALESCE(p.image_url, '') AS image_url,
				p.is_available,
				p.is_featured,
				COALESCE(p.confidence, 'needs-review') AS confidence
			FROM products p
			JOIN catalog_sections cs ON cs.id = p.section_id
			JOIN catalogs c ON c.id = p.catalog_id
			WHERE p.outlet_id = ANY($1::uuid[])
				AND c.status = 'published'
			ORDER BY p.outlet_id::text, p.sort_order, p.name
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
			spiceLevel: 0,
			isAvailable: row.is_available,
			isSignature: row.is_featured,
			dietaryFlags: [],
			allergens: [],
			goodFor: [],
			confidence: row.confidence
		};

		items.set(row.outlet_id, [...(items.get(row.outlet_id) ?? []), item]);
	}

	return items;
}

export async function loadImportIssues(
	_client: DatabaseClient,
	_restaurantIds: string[]
): Promise<Map<string, MenuImportIssue[]>> {
	// menu_import_issues was dropped in migration 0024.
	// Return empty map — callers treat missing issues as an empty list.
	return new Map<string, MenuImportIssue[]>();
}
