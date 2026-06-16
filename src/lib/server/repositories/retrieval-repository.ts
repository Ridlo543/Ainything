import { query } from '$lib/server/db/postgres';
import type { MenuItem, DietaryFlag, Allergen } from '$lib/domain/menu/types';

type RetrievalFilters = {
	dietaryFlags?: DietaryFlag[];
	allergenExcludes?: Allergen[];
	categoryId?: string;
	availableOnly?: boolean;
	searchQuery?: string;
};

type MenuItemRow = {
	id: string;
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

function mapRowToMenuItem(row: MenuItemRow): MenuItem {
	return {
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
}

/**
 * Retrieves menu items for a restaurant using structured SQL filters.
 *
 * Always scopes to:
 *   - The given restaurant_id
 *   - Published menu (m.status = 'published')
 *   - Active items (when availableOnly is true)
 *
 * Optional filters:
 *   - dietaryFlags: only items that have ALL specified flags
 *   - allergenExcludes: exclude items that contain ANY of the specified allergens
 *   - categoryId: filter by category id
 *   - searchQuery: ILIKE text search on name + description
 */
export async function retrieveMenuItemsByFilters(
	restaurantId: string,
	filters: RetrievalFilters
): Promise<MenuItem[]> {
	const {
		dietaryFlags = [],
		allergenExcludes = [],
		categoryId,
		availableOnly = true,
		searchQuery
	} = filters;

	const conditions: string[] = ['mi.restaurant_id = $1::uuid', "m.status = 'published'"];
	const params: (string | number | boolean | string[] | null)[] = [restaurantId];
	let paramIdx = 2;

	// Filter by availability (default: only available items)
	if (availableOnly) {
		conditions.push('mi.is_available = true');
	}

	// Filter by category
	if (categoryId) {
		conditions.push(`mi.category_id = $${paramIdx}::uuid`);
		params.push(categoryId);
		paramIdx++;
	}

	// Filter: items must have ALL specified dietary flags
	if (dietaryFlags.length > 0) {
		conditions.push(`
			mi.id IN (
				SELECT midf.menu_item_id
				FROM menu_item_dietary_flags midf
				WHERE midf.flag_code = ANY($${paramIdx}::text[])
				GROUP BY midf.menu_item_id
				HAVING COUNT(DISTINCT midf.flag_code) = ${dietaryFlags.length}
			)
		`);
		params.push(dietaryFlags);
		paramIdx++;
	}

	// Filter: exclude items that contain ANY of the specified allergens
	if (allergenExcludes.length > 0) {
		conditions.push(`
			mi.id NOT IN (
				SELECT mia.menu_item_id
				FROM menu_item_allergens mia
				WHERE mia.allergen_code = ANY($${paramIdx}::text[])
			)
		`);
		params.push(allergenExcludes);
		paramIdx++;
	}

	// Text search on name and description
	if (searchQuery && searchQuery.trim().length > 0) {
		const searchTerm = `%${searchQuery.trim()}%`;
		conditions.push(
			`(mi.name ILIKE $${paramIdx} OR mi.description ILIKE $${paramIdx} OR mi.local_name ILIKE $${paramIdx})`
		);
		params.push(searchTerm);
	}

	const whereClause = conditions.join('\n\t\t\t\tAND ');

	const sql = `
		SELECT
			mi.id::text,
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
		WHERE ${whereClause}
		GROUP BY mi.id, mc.name
		ORDER BY mi.sort_order, mi.name
	`;

	const result = await query<MenuItemRow>(sql, params);
	return result.rows.map(mapRowToMenuItem);
}
