/**
 * Admin/manager write operations for menu data.
 *
 * All methods accept a `DatabaseClient` so callers control the transaction
 * boundary (typically `withUserContext`). Every query is scoped by
 * organization_id + restaurant_id so the 0006 RLS write policies evaluate
 * correctly for the authenticated membership.
 *
 * This repository intentionally does NOT handle menu publishing (archive old +
 * promote new) — that multi-step operation is owned by the service layer
 * because it requires a single transaction across the `menus` table.
 */

import type { DatabaseClient } from '$lib/server/db/postgres';
import type { MenuItem, Allergen, DietaryFlag } from '$lib/domain/menu/types';

// ---------------------------------------------------------------------------
// Types matching the DB row shape (snake_case, postgres native types)
// ---------------------------------------------------------------------------

type AdminMenuItemRow = {
	id: string;
	restaurant_id: string;
	menu_id: string;
	category_id: string;
	category: string;
	name: string;
	local_name: string | null;
	description: string;
	price_amount: number;
	currency: string;
	image_url: string;
	spice_level: number;
	is_available: boolean;
	is_signature: boolean;
	confidence: string;
	sort_order: number;
	source_metadata: Record<string, unknown>;
	dietary_flags: DietaryFlag[];
	allergens: Allergen[];
};

type MenuRow = {
	id: string;
	restaurant_id: string;
	version: number;
	status: string;
	published_at: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRowToMenuItem(row: AdminMenuItemRow): MenuItem {
	return {
		id: row.id,
		category: row.category,
		name: row.name,
		localName: row.local_name ?? undefined,
		description: row.description,
		price: row.price_amount,
		currency: row.currency as MenuItem['currency'],
		image: row.image_url,
		spiceLevel: row.spice_level as MenuItem['spiceLevel'],
		isAvailable: row.is_available,
		isSignature: row.is_signature,
		dietaryFlags: row.dietary_flags,
		allergens: row.allergens,
		goodFor: (row.source_metadata as Record<string, unknown>)?.goodFor
			? ((row.source_metadata as Record<string, unknown>).goodFor as string[])
			: [],
		confidence: row.confidence as MenuItem['confidence']
	};
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Loads a single menu item scoped to an organization + restaurant + item id.
 * Returns null if the row does not exist or the caller lacks access (RLS).
 */
export async function findMenuItemById(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		itemId
	}: { organizationId: string; restaurantId: string; itemId: string }
): Promise<MenuItem | null> {
	const result = await client.query<AdminMenuItemRow>(
		`
			SELECT
				mi.id::text,
				mi.restaurant_id::text,
				mi.menu_id::text,
				mi.category_id::text,
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
				mi.sort_order,
				mi.source_metadata,
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
			WHERE mi.id = $1::uuid
				AND mi.restaurant_id = $2::uuid
				AND mi.organization_id = $3::uuid
			GROUP BY mi.id, mc.name
		`,
		[itemId, restaurantId, organizationId]
	);

	const row = result.rows[0];
	return row ? mapRowToMenuItem(row) : null;
}

/**
 * Loads ALL menu items for a restaurant (regardless of menu status — draft +
 * published). Used by the admin menu editor to show the full picture.
 * Returns items grouped by menu_id; the caller picks the active/draft menu.
 */
export async function loadMenuItemsForRestaurant(
	client: DatabaseClient,
	{ organizationId, restaurantId }: { organizationId: string; restaurantId: string }
): Promise<MenuItem[]> {
	const result = await client.query<AdminMenuItemRow>(
		`
			SELECT
				mi.id::text,
				mi.restaurant_id::text,
				mi.menu_id::text,
				mi.category_id::text,
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
				mi.sort_order,
				mi.source_metadata,
				COALESCE(
					ARRAY_AGG(DISTINCT midf.flag_code) FILTER (WHERE midf.flag_code IS NOT NULL),
					ARRAY[]::text[]
				) AS dietary_flags,
				COALESCE(
					ARRAY_AGG(DISTINCT mia.allergen_code) FILTER (WHERE mia.allergen_code IS NOT NULL),
					ARRAY[]::text[]
				) AS allergens
			FROM menu_items mi
			JOIN menu_categories mc ON mc.id = mi.category_id
			LEFT JOIN menu_item_dietary_flags midf ON midf.menu_item_id = mi.id
			LEFT JOIN menu_item_allergens mia ON mia.menu_item_id = mi.id
			WHERE mi.restaurant_id = $1::uuid
				AND mi.organization_id = $2::uuid
			GROUP BY mi.id, mc.name
			ORDER BY mi.sort_order, mi.name
		`,
		[restaurantId, organizationId]
	);

	return result.rows.map(mapRowToMenuItem);
}

/**
 * Loads the menu records for a restaurant (draft + published + archived).
 * Returns the most recent draft and the current published menu (if any).
 */
export async function loadMenusForRestaurant(
	client: DatabaseClient,
	{ organizationId, restaurantId }: { organizationId: string; restaurantId: string }
): Promise<MenuRow[]> {
	const result = await client.query<MenuRow>(
		`
			SELECT id::text, restaurant_id::text, version, status, published_at::text
			FROM menus
			WHERE restaurant_id = $1::uuid
				AND organization_id = $2::uuid
			ORDER BY version DESC
		`,
		[restaurantId, organizationId]
	);
	return result.rows;
}

/**
 * Loads menu items for a specific menu (draft or published), including flags +
 * allergens. Used by the publish DQG gate to validate all items before going
 * live.
 */
export async function loadMenuItemsForMenu(
	client: DatabaseClient,
	{
		menuId,
		restaurantId,
		organizationId
	}: { menuId: string; restaurantId: string; organizationId: string }
): Promise<MenuItem[]> {
	const result = await client.query<AdminMenuItemRow>(
		`
			SELECT
				mi.id::text,
				mi.restaurant_id::text,
				mi.menu_id::text,
				mi.category_id::text,
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
				mi.sort_order,
				mi.source_metadata,
				COALESCE(
					ARRAY_AGG(DISTINCT midf.flag_code) FILTER (WHERE midf.flag_code IS NOT NULL),
					ARRAY[]::text[]
				) AS dietary_flags,
				COALESCE(
					ARRAY_AGG(DISTINCT mia.allergen_code) FILTER (WHERE mia.allergen_code IS NOT NULL),
					ARRAY[]::text[]
				) AS allergens
			FROM menu_items mi
			JOIN menu_categories mc ON mc.id = mi.category_id
			LEFT JOIN menu_item_dietary_flags midf ON midf.menu_item_id = mi.id
			LEFT JOIN menu_item_allergens mia ON mia.menu_item_id = mi.id
			WHERE mi.menu_id = $1::uuid
				AND mi.restaurant_id = $2::uuid
				AND mi.organization_id = $3::uuid
			GROUP BY mi.id, mc.name
			ORDER BY mi.sort_order, mi.name
		`,
		[menuId, restaurantId, organizationId]
	);

	return result.rows.map(mapRowToMenuItem);
}

/**
 * Loads the count of menu items in a given menu (for publish validation).
 */
export async function countMenuItems(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		menuId
	}: { organizationId: string; restaurantId: string; menuId: string }
): Promise<number> {
	const result = await client.query<{ count: string }>(
		`SELECT COUNT(*)::text AS count FROM menu_items WHERE menu_id = $1::uuid AND restaurant_id = $2::uuid AND organization_id = $3::uuid`,
		[menuId, restaurantId, organizationId]
	);
	return Number(result.rows[0]?.count ?? 0);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Updates the scalar columns of a menu item (name, localName, description,
 * price, spiceLevel, isAvailable, confidence). Flags are handled separately
 * by `updateMenuItemFlags`.
 *
 * Returns the updated row mapped to a MenuItem, or null if the row was not
 * found / access denied (RLS).
 */
export async function updateMenuItem(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		itemId,
		name,
		localName,
		description,
		price,
		spiceLevel,
		isAvailable,
		confidence
	}: {
		organizationId: string;
		restaurantId: string;
		itemId: string;
		name: string;
		localName: string | undefined;
		description: string;
		price: number;
		spiceLevel: number;
		isAvailable: boolean;
		confidence: string;
	}
): Promise<MenuItem | null> {
	const result = await client.query<AdminMenuItemRow>(
		`
			UPDATE menu_items
			SET
				name        = $3,
				local_name  = $4,
				description = $5,
				price_amount = $6,
				spice_level = $7,
				is_available = $8,
				confidence  = $9
			WHERE id = $1::uuid
				AND restaurant_id = $2::uuid
				AND organization_id = $10::uuid
			RETURNING
				id::text, restaurant_id::text, menu_id::text, category_id::text,
				name, local_name, description, price_amount, currency, image_url,
				spice_level, is_available, is_signature, confidence, sort_order,
				source_metadata,
				COALESCE(ARRAY[]::text[]) AS dietary_flags,
				COALESCE(ARRAY[]::text[]) AS allergens
		`,
		[
			itemId,
			restaurantId,
			name,
			localName ?? null,
			description,
			price,
			spiceLevel,
			isAvailable,
			confidence,
			organizationId
		]
	);

	const row = result.rows[0];
	if (!row) return null;

	// Dietary flags and allergens need a separate load after the scalar update.
	return reloadItemFlags(client, { organizationId, restaurantId, itemId: row.id });
}

/**
 * Fast path for toggling item availability (sold-out / back in stock).
 * Only touches `is_available`; does not re-read flags or metadata.
 */
export async function setMenuItemAvailability(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		itemId,
		isAvailable
	}: { organizationId: string; restaurantId: string; itemId: string; isAvailable: boolean }
): Promise<boolean> {
	const result = await client.query<{ id: string }>(
		`
			UPDATE menu_items
			SET is_available = $4
			WHERE id = $1::uuid
				AND restaurant_id = $2::uuid
				AND organization_id = $3::uuid
			RETURNING id::text
		`,
		[itemId, restaurantId, organizationId, isAvailable]
	);
	return result.rows.length > 0;
}

/**
 * Replaces the dietary flags and allergens for a menu item by deleting all
 * existing rows and inserting the new set. Runs within the caller's transaction.
 */
export async function updateMenuItemFlags(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		itemId,
		dietaryFlags,
		allergens
	}: {
		organizationId: string;
		restaurantId: string;
		itemId: string;
		dietaryFlags: string[];
		allergens: string[];
	}
): Promise<void> {
	// Scope check: verify the item belongs to this restaurant before mutating flags.
	const check = await client.query<{ id: string }>(
		`SELECT id::text FROM menu_items WHERE id = $1::uuid AND restaurant_id = $2::uuid AND organization_id = $3::uuid`,
		[itemId, restaurantId, organizationId]
	);
	if (check.rows.length === 0) return;

	// Delete existing flags (RLS ensures only accessible rows are affected).
	await client.query(`DELETE FROM menu_item_dietary_flags WHERE menu_item_id = $1::uuid`, [itemId]);
	await client.query(`DELETE FROM menu_item_allergens WHERE menu_item_id = $1::uuid`, [itemId]);

	// Insert new flags.
	for (const code of dietaryFlags) {
		await client.query(
			`INSERT INTO menu_item_dietary_flags (menu_item_id, flag_code) VALUES ($1::uuid, $2)`,
			[itemId, code]
		);
	}
	for (const code of allergens) {
		await client.query(
			`INSERT INTO menu_item_allergens (menu_item_id, allergen_code) VALUES ($1::uuid, $2)`,
			[itemId, code]
		);
	}
}

// ---------------------------------------------------------------------------
// Publish operations (single-transaction)
// ---------------------------------------------------------------------------

/**
 * Archives the currently published menu (if any) and promotes a draft menu to
 * published status. Must run inside a `withUserContext` transaction so RLS
 * evaluates correctly for the UPDATE.
 *
 * The DB partial unique index `menus_one_published_per_restaurant` ensures
 * only one menu is published at a time per restaurant — this function archives
 * the old one first so the constraint is never violated.
 *
 * Returns the newly published menu id, or null if the draft menu does not exist.
 */
export async function publishMenu(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		menuId
	}: { organizationId: string; restaurantId: string; menuId: string }
): Promise<string | null> {
	// Archive the current published menu (if any) for this restaurant.
	await client.query(
		`UPDATE menus SET status = 'archived' WHERE restaurant_id = $1::uuid AND organization_id = $2::uuid AND status = 'published'`,
		[restaurantId, organizationId]
	);

	// Promote the draft menu.
	const result = await client.query<{ id: string }>(
		`
			UPDATE menus
			SET status = 'published', published_at = now()
			WHERE id = $1::uuid
				AND restaurant_id = $2::uuid
				AND organization_id = $3::uuid
				AND status = 'draft'
			RETURNING id::text
		`,
		[menuId, restaurantId, organizationId]
	);

	return result.rows[0]?.id ?? null;
}

/**
 * Creates a new draft menu for a restaurant. Used by the OCR import path
 * when no draft menu exists.
 */
export async function createDraftMenu(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		version,
		sourceType
	}: {
		organizationId: string;
		restaurantId: string;
		version: number;
		sourceType: string;
	}
): Promise<string> {
	const result = await client.query<{ id: string }>(
		`
			INSERT INTO menus (organization_id, restaurant_id, version, status, source_type)
			VALUES ($1::uuid, $2::uuid, $3, 'draft', $4)
			RETURNING id::text
		`,
		[organizationId, restaurantId, version, sourceType]
	);

	const row = result.rows[0];
	if (!row) {
		throw new Error('Failed to create draft menu: INSERT returned no rows');
	}
	return row.id;
}

// ---------------------------------------------------------------------------
// Insert (OCR import path)
// ---------------------------------------------------------------------------

/**
 * Ensures a category exists for a menu, creating one if it doesn't.
 * Returns the category id — either the existing one or the newly created one.
 */
export async function ensureCategory(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		menuId,
		name
	}: { organizationId: string; restaurantId: string; menuId: string; name: string }
): Promise<string> {
	await client.query(
		`
			INSERT INTO menu_categories (organization_id, restaurant_id, menu_id, name)
			VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
			ON CONFLICT (menu_id, name) DO NOTHING
		`,
		[organizationId, restaurantId, menuId, name]
	);

	const result = await client.query<{ id: string }>(
		`SELECT id::text FROM menu_categories WHERE menu_id = $1::uuid AND name = $2`,
		[menuId, name]
	);

	return result.rows[0]!.id;
}

/**
 * Inserts a single menu item with dietary flags, allergens, and source_metadata
 * (used to store OCR confidence scores). Runs within the caller's transaction.
 * All items imported via OCR start with confidence='needs-review'.
 */
export async function insertMenuItem(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		menuId,
		categoryId,
		name,
		localName,
		description,
		price,
		spiceLevel,
		isSignature,
		dietaryFlags,
		allergens,
		sourceMetadata,
		sortOrder
	}: {
		organizationId: string;
		restaurantId: string;
		menuId: string;
		categoryId: string;
		name: string;
		localName?: string;
		description: string;
		price: number;
		spiceLevel: number;
		isSignature: boolean;
		dietaryFlags: string[];
		allergens: string[];
		sourceMetadata?: Record<string, unknown>;
		sortOrder?: number;
	}
): Promise<MenuItem> {
	const result = await client.query<{ id: string }>(
		`
			INSERT INTO menu_items (
				organization_id, restaurant_id, menu_id, category_id,
				name, local_name, description, price_amount,
				spice_level, is_signature, confidence, sort_order, source_metadata
			) VALUES (
				$1::uuid, $2::uuid, $3::uuid, $4::uuid,
				$5, $6, $7, $8,
				$9, $10, 'needs-review', $11, $12::jsonb
			)
			RETURNING id::text
		`,
		[
			organizationId,
			restaurantId,
			menuId,
			categoryId,
			name,
			localName ?? null,
			description,
			price,
			spiceLevel,
			isSignature,
			sortOrder ?? 0,
			JSON.stringify(sourceMetadata ?? {})
		]
	);

	const itemId = result.rows[0]!.id;

	for (const code of dietaryFlags) {
		await client.query(
			`INSERT INTO menu_item_dietary_flags (menu_item_id, flag_code) VALUES ($1::uuid, $2)`,
			[itemId, code]
		);
	}
	for (const code of allergens) {
		await client.query(
			`INSERT INTO menu_item_allergens (menu_item_id, allergen_code) VALUES ($1::uuid, $2)`,
			[itemId, code]
		);
	}

	return (await reloadItemFlags(client, { organizationId, restaurantId, itemId }))!;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Re-reads a menu item with its dietary flags and allergens after a scalar
 * update that didn't return the join data.
 */
async function reloadItemFlags(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		itemId
	}: { organizationId: string; restaurantId: string; itemId: string }
): Promise<MenuItem | null> {
	const result = await client.query<AdminMenuItemRow>(
		`
			SELECT
				mi.id::text,
				mi.restaurant_id::text,
				mi.menu_id::text,
				mi.category_id::text,
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
				mi.sort_order,
				mi.source_metadata,
				COALESCE(
					ARRAY_AGG(DISTINCT midf.flag_code) FILTER (WHERE midf.flag_code IS NOT NULL),
					ARRAY[]::text[]
				) AS dietary_flags,
				COALESCE(
					ARRAY_AGG(DISTINCT mia.allergen_code) FILTER (WHERE mia.allergen_code IS NOT NULL),
					ARRAY[]::text[]
				) AS allergens
			FROM menu_items mi
			JOIN menu_categories mc ON mc.id = mi.category_id
			LEFT JOIN menu_item_dietary_flags midf ON midf.menu_item_id = mi.id
			LEFT JOIN menu_item_allergens mia ON mia.menu_item_id = mi.id
			WHERE mi.id = $1::uuid
				AND mi.restaurant_id = $2::uuid
				AND mi.organization_id = $3::uuid
			GROUP BY mi.id, mc.name
		`,
		[itemId, restaurantId, organizationId]
	);

	const row = result.rows[0];
	return row ? mapRowToMenuItem(row) : null;
}
