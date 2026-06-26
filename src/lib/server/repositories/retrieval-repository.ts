import { query } from '$lib/server/db/postgres';
import type { MenuItem, DietaryFlag, Allergen } from '$lib/domain/menu/types';

type RetrievalFilters = {
	dietaryFlags?: DietaryFlag[];
	allergenExcludes?: Allergen[];
	/** section_id (catalog_sections.id) — replaces old categoryId */
	categoryId?: string;
	availableOnly?: boolean;
	searchQuery?: string;
};

type ProductRow = {
	id: string;
	category: string;
	name: string;
	local_name: string | null;
	description: string;
	price_amount: number;
	currency: MenuItem['currency'];
	image_url: string;
	is_available: boolean;
	is_featured: boolean;
	confidence: MenuItem['confidence'];
	good_for: string[];
};

function mapRowToMenuItem(row: ProductRow): MenuItem {
	return {
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
		// dietary_flags and allergens were dropped in migration 0024;
		// the products table stores these in source_metadata only.
		dietaryFlags: [] as DietaryFlag[],
		allergens: [] as Allergen[],
		goodFor: row.good_for,
		confidence: row.confidence
	};
}

/**
 * Retrieves products for an outlet using structured SQL filters.
 *
 * Always scopes to:
 *   - The given outlet_id
 *   - Published catalog (m.status = 'published')
 *   - Available products (when availableOnly is true)
 *
 * Optional filters:
 *   - dietaryFlags: NOTE — dietary flag filtering is no longer supported at the
 *     DB level after migration 0024 dropped menu_item_dietary_flags. Pass an
 *     empty array or omit. If non-empty, results are not further filtered (the
 *     flags are not stored in a queryable column).
 *   - allergenExcludes: same caveat — allergen exclusion is no longer enforced
 *     at the DB layer. Pass empty or omit.
 *   - categoryId: filter by catalog_sections.id
 *   - searchQuery: ILIKE text search on name + description
 */
export async function retrieveMenuItemsByFilters(
	restaurantId: string,
	filters: RetrievalFilters
): Promise<MenuItem[]> {
	const {
		categoryId,
		availableOnly = true,
		searchQuery
		// dietaryFlags and allergenExcludes are accepted for API compat but not
		// applied at the DB level — the junction tables were dropped in 0024.
	} = filters;

	const conditions: string[] = ['mi.outlet_id = $1::uuid', "m.status = 'published'"];
	const params: (string | number | boolean | string[] | null)[] = [restaurantId];
	let paramIdx = 2;

	// Filter by availability (default: only available items)
	if (availableOnly) {
		conditions.push('mi.is_available = true');
	}

	// Filter by section (replaces old category_id)
	if (categoryId) {
		conditions.push(`mi.section_id = $${paramIdx}::uuid`);
		params.push(categoryId);
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
			mi.is_available,
			mi.is_featured,
			mi.confidence,
			COALESCE(mi.source_metadata->'goodFor', '[]'::jsonb) AS good_for
		FROM products mi
		JOIN catalogs m ON m.id = mi.catalog_id
		JOIN catalog_sections mc ON mc.id = mi.section_id
		WHERE ${whereClause}
		ORDER BY mi.sort_order, mi.name
	`;

	const result = await query<ProductRow>(sql, params);
	return result.rows.map(mapRowToMenuItem);
}
