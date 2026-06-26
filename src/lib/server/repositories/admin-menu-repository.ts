/**
 * Admin/manager write operations for catalog/product data.
 *
 * All methods accept a `DatabaseClient` so callers control the transaction
 * boundary (typically `withUserContext`). Every query is scoped by
 * organization_id + outlet_id so RLS write policies evaluate correctly for
 * the authenticated membership.
 *
 * This repository intentionally does NOT handle catalog publishing (archive old +
 * promote new) — that multi-step operation is owned by the service layer
 * because it requires a single transaction across the `catalogs` table.
 *
 * @deprecated Renamed from menu-centric to outlet/catalog/product terminology.
 *   Prefer using outlet-repository.ts and catalog-admin-service.ts for new code.
 */

import type { DatabaseClient } from '$lib/server/db/postgres';
import type { Product, DietaryFlag, Allergen } from '$lib/domain/outlet/types';

// ---------------------------------------------------------------------------
// Types matching the DB row shape (snake_case, postgres native types)
// ---------------------------------------------------------------------------

type AdminProductRow = {
	id: string;
	outlet_id: string;
	catalog_id: string;
	section_id: string;
	section_name: string;
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

type CatalogRow = {
	id: string;
	outlet_id: string;
	version: number;
	status: string;
	published_at: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRowToProduct(row: AdminProductRow): Product {
	return {
		id: row.id,
		section: row.section_name,
		name: row.name,
		localName: row.local_name ?? undefined,
		description: row.description,
		price: row.price_amount,
		currency: row.currency as Product['currency'],
		imageUrl: row.image_url,
		isAvailable: row.is_available,
		isSignature: row.is_signature,
		dietaryFlags: row.dietary_flags,
		allergens: row.allergens,
		goodFor: (row.source_metadata as Record<string, unknown>)?.goodFor
			? ((row.source_metadata as Record<string, unknown>).goodFor as string[])
			: [],
		confidence: row.confidence as Product['confidence'],
		sortOrder: row.sort_order
	};
}

/**
 * Reloads a single product with its dietary flags and allergens.
 * Used after scalar field updates to return the complete domain object.
 */
async function reloadProductFlags(
	client: DatabaseClient,
	{
		organizationId,
		outletId,
		productId
	}: { organizationId: string; outletId: string; productId: string }
): Promise<Product | null> {
	const result = await client.query<AdminProductRow>(
		`
			SELECT
				p.id::text,
				p.outlet_id::text,
				p.catalog_id::text,
				p.section_id::text,
				cs.name AS section_name,
				p.name,
				p.local_name,
				p.description,
				p.price_amount,
				p.currency,
				p.image_url,
				p.spice_level,
				p.is_available,
				p.is_signature,
				p.confidence,
				p.sort_order,
				p.source_metadata,
				COALESCE(
					ARRAY_AGG(DISTINCT pdf.flag_code) FILTER (WHERE pdf.flag_code IS NOT NULL),
					ARRAY[]::text[]
				) AS dietary_flags,
				COALESCE(
					ARRAY_AGG(DISTINCT pa.allergen_code) FILTER (WHERE pa.allergen_code IS NOT NULL),
					ARRAY[]::text[]
				) AS allergens
			FROM products p
			JOIN catalog_sections cs ON cs.id = p.section_id
			LEFT JOIN product_dietary_flags pdf ON pdf.product_id = p.id
			LEFT JOIN product_allergens pa ON pa.product_id = p.id
			WHERE p.id = $1::uuid
				AND p.outlet_id = $2::uuid
				AND p.organization_id = $3::uuid
			GROUP BY p.id, cs.name
		`,
		[productId, outletId, organizationId]
	);

	const row = result.rows[0];
	return row ? mapRowToProduct(row) : null;
}

/**
 * Fetches a single product by ID, scoped to an outlet and organization.
 */
export async function getProductById(
	client: DatabaseClient,
	{
		organizationId,
		outletId,
		productId
	}: { organizationId: string; outletId: string; productId: string }
): Promise<Product | null> {
	return reloadProductFlags(client, { organizationId, outletId, productId });
}

/**
 * Loads ALL products for an outlet (regardless of catalog status — draft +
 * published). Used by the admin catalog editor to show the full picture.
 */
export async function loadProductsForOutlet(
	client: DatabaseClient,
	{ organizationId, outletId }: { organizationId: string; outletId: string }
): Promise<Product[]> {
	const result = await client.query<AdminProductRow>(
		`
			SELECT
				p.id::text,
				p.outlet_id::text,
				p.catalog_id::text,
				p.section_id::text,
				cs.name AS section_name,
				p.name,
				p.local_name,
				p.description,
				p.price_amount,
				p.currency,
				p.image_url,
			0 AS spice_level,
			p.is_available,
			p.is_signature,
			p.confidence,
			p.sort_order,
			p.source_metadata,
			COALESCE(
				ARRAY_AGG(DISTINCT pdf.flag_code) FILTER (WHERE pdf.flag_code IS NOT NULL),
				ARRAY[]::text[]
			) AS dietary_flags,
			COALESCE(
				ARRAY_AGG(DISTINCT pa.allergen_code) FILTER (WHERE pa.allergen_code IS NOT NULL),
				ARRAY[]::text[]
			) AS allergens
		FROM products p
		JOIN catalog_sections cs ON cs.id = p.section_id
		LEFT JOIN product_dietary_flags pdf ON pdf.product_id = p.id
		LEFT JOIN product_allergens pa ON pa.product_id = p.id
		WHERE p.outlet_id = $1::uuid
			AND p.organization_id = $2::uuid
		GROUP BY p.id, cs.name
		ORDER BY p.sort_order, p.name
	`,
		[outletId, organizationId]
	);

	return result.rows.map(mapRowToProduct);
}

/**
 * Loads the catalog records for an outlet (draft + published + archived).
 */
export async function loadCatalogsForOutlet(
	client: DatabaseClient,
	{ organizationId, outletId }: { organizationId: string; outletId: string }
): Promise<CatalogRow[]> {
	const result = await client.query<CatalogRow>(
		`
			SELECT id::text, outlet_id::text, version, status, published_at::text
			FROM catalogs
			WHERE outlet_id = $1::uuid
				AND organization_id = $2::uuid
			ORDER BY sort_order ASC, name ASC
		`,
		[outletId, organizationId]
	);
	return result.rows;
}

/**
 * Loads products for a specific catalog (draft or published), including flags +
 * allergens. Used by the publish quality-gate to validate all items before going live.
 */
export async function loadProductsForCatalog(
	client: DatabaseClient,
	{
		organizationId,
		outletId,
		catalogId
	}: { organizationId: string; outletId: string; catalogId: string }
): Promise<Product[]> {
	const result = await client.query<AdminProductRow>(
		`
			SELECT
				p.id::text,
				p.outlet_id::text,
				p.catalog_id::text,
				p.section_id::text,
				cs.name AS section_name,
				p.name,
				p.local_name,
				p.description,
				p.price_amount,
				p.currency,
				p.image_url,
				p.spice_level,
				p.is_available,
				p.is_signature,
				p.confidence,
				p.sort_order,
				p.source_metadata,
				COALESCE(
					ARRAY_AGG(DISTINCT pdf.flag_code) FILTER (WHERE pdf.flag_code IS NOT NULL),
					ARRAY[]::text[]
				) AS dietary_flags,
				COALESCE(
					ARRAY_AGG(DISTINCT pa.allergen_code) FILTER (WHERE pa.allergen_code IS NOT NULL),
					ARRAY[]::text[]
				) AS allergens
			FROM products p
			JOIN catalog_sections cs ON cs.id = p.section_id
			LEFT JOIN product_dietary_flags pdf ON pdf.product_id = p.id
			LEFT JOIN product_allergens pa ON pa.product_id = p.id
			WHERE p.catalog_id = $1::uuid
				AND p.outlet_id = $2::uuid
				AND p.organization_id = $3::uuid
			GROUP BY p.id, cs.name
			ORDER BY p.sort_order, p.name
		`,
		[catalogId, outletId, organizationId]
	);

	return result.rows.map(mapRowToProduct);
}

/**
 * Creates a new product under a catalog section.
 */
export async function createProduct(
	client: DatabaseClient,
	{
		organizationId,
		outletId,
		catalogId,
		sectionId,
		data
	}: {
		organizationId: string;
		outletId: string;
		catalogId: string;
		sectionId: string;
		data: {
			name: string;
			localName?: string;
			description?: string;
			priceAmount: number;
			currency?: string;
			imageUrl?: string;
			spiceLevel?: number;
			isAvailable?: boolean;
			isSignature?: boolean;
			confidence?: string;
			sortOrder?: number;
		};
	}
): Promise<Product | null> {
	const result = await client.query<{ id: string }>(
		`
			INSERT INTO products (
				organization_id, outlet_id, catalog_id, section_id,
				name, local_name, description, price_amount, currency,
				image_url, spice_level, is_available, is_signature, confidence, sort_order
			) VALUES (
				$1::uuid, $2::uuid, $3::uuid, $4::uuid,
				$5, $6, $7, $8, $9,
				$10, $11, $12, $13, $14, $15
			)
			RETURNING id::text
		`,
		[
			organizationId,
			outletId,
			catalogId,
			sectionId,
			data.name,
			data.localName ?? null,
			data.description ?? '',
			data.priceAmount,
			data.currency ?? 'IDR',
			data.imageUrl ?? '',
			data.spiceLevel ?? 0,
			data.isAvailable ?? true,
			data.isSignature ?? false,
			data.confidence ?? 'needs-review',
			data.sortOrder ?? 0
		]
	);

	const row = result.rows[0];
	if (!row) return null;
	return reloadProductFlags(client, { organizationId, outletId, productId: row.id });
}

/**
 * Updates the scalar fields of an existing product.
 * Does NOT update dietary_flags or allergens — use updateProductFlags for that.
 */
export async function updateProduct(
	client: DatabaseClient,
	{
		organizationId,
		outletId,
		productId,
		data
	}: {
		organizationId: string;
		outletId: string;
		productId: string;
		data: Partial<{
			name: string;
			localName: string | null;
			description: string;
			priceAmount: number;
			imageUrl: string;
			spiceLevel: number;
			isAvailable: boolean;
			isSignature: boolean;
			confidence: string;
			sortOrder: number;
		}>;
	}
): Promise<Product | null> {
	const updates: string[] = [];
	const values: (string | number | boolean | null)[] = [];
	let idx = 1;

	const fieldMap: Record<string, string> = {
		name: 'name',
		localName: 'local_name',
		description: 'description',
		priceAmount: 'price_amount',
		imageUrl: 'image_url',
		spiceLevel: 'spice_level',
		isAvailable: 'is_available',
		isSignature: 'is_signature',
		confidence: 'confidence',
		sortOrder: 'sort_order'
	};

	for (const [key, col] of Object.entries(fieldMap)) {
		if (key in data) {
			updates.push(`${col} = $${idx}`);
			values.push(data[key as keyof typeof data] as string | number | boolean | null);
			idx++;
		}
	}

	if (updates.length === 0) return getProductById(client, { organizationId, outletId, productId });

	updates.push(`updated_at = now()`);
	values.push(productId, outletId, organizationId);

	const result = await client.query<{ id: string }>(
		`
			UPDATE products
			SET ${updates.join(', ')}
			WHERE id = $${idx}::uuid
				AND outlet_id = $${idx + 1}::uuid
				AND organization_id = $${idx + 2}::uuid
			RETURNING id::text
		`,
		values
	);

	const row = result.rows[0];
	if (!row) return null;
	return reloadProductFlags(client, { organizationId, outletId, productId: row.id });
}

/**
 * Fast path for toggling product availability (sold-out / back in stock).
 */
export async function setProductAvailability(
	client: DatabaseClient,
	{
		organizationId,
		outletId,
		productId,
		isAvailable
	}: { organizationId: string; outletId: string; productId: string; isAvailable: boolean }
): Promise<boolean> {
	const result = await client.query<{ id: string }>(
		`
			UPDATE products
			SET is_available = $4
			WHERE id = $1::uuid
				AND outlet_id = $2::uuid
				AND organization_id = $3::uuid
			RETURNING id::text
		`,
		[productId, outletId, organizationId, isAvailable]
	);
	return result.rows.length > 0;
}

/**
 * Replaces the dietary flags and allergens for a product.
 */
export async function updateProductFlags(
	client: DatabaseClient,
	{
		organizationId,
		outletId,
		productId,
		dietaryFlags,
		allergens
	}: {
		organizationId: string;
		outletId: string;
		productId: string;
		dietaryFlags: string[];
		allergens: string[];
	}
): Promise<void> {
	const check = await client.query<{ id: string }>(
		`SELECT id::text FROM products WHERE id = $1::uuid AND outlet_id = $2::uuid AND organization_id = $3::uuid`,
		[productId, outletId, organizationId]
	);
	if (check.rows.length === 0) return;

	await client.query(`DELETE FROM product_dietary_flags WHERE product_id = $1::uuid`, [productId]);
	await client.query(`DELETE FROM product_allergens WHERE product_id = $1::uuid`, [productId]);

	for (const code of dietaryFlags) {
		await client.query(
			`INSERT INTO product_dietary_flags (product_id, flag_code) VALUES ($1::uuid, $2)`,
			[productId, code]
		);
	}
	for (const code of allergens) {
		await client.query(
			`INSERT INTO product_allergens (product_id, allergen_code) VALUES ($1::uuid, $2)`,
			[productId, code]
		);
	}
}

/**
 * Publishes a catalog: archives the current published catalog and promotes a draft.
 */
export async function publishCatalog(
	client: DatabaseClient,
	{
		organizationId,
		outletId,
		catalogId
	}: { organizationId: string; outletId: string; catalogId: string }
): Promise<string | null> {
	// Archive the currently published catalog (if any).
	await client.query(
		`
			UPDATE catalogs
			SET status = 'archived', updated_at = now()
			WHERE outlet_id = $1::uuid
				AND organization_id = $2::uuid
				AND status = 'published'
		`,
		[outletId, organizationId]
	);

	// Promote the specified draft catalog to published.
	const result = await client.query<{ id: string }>(
		`
			UPDATE catalogs
			SET status = 'published', published_at = now(), updated_at = now()
			WHERE id = $1::uuid
				AND outlet_id = $2::uuid
				AND organization_id = $3::uuid
				AND status = 'draft'
			RETURNING id::text
		`,
		[catalogId, outletId, organizationId]
	);

	return result.rows[0]?.id ?? null;
}

/**
 * Loads the published (public-facing) products for a given outlet.
 * Used by retrieval/embedding pipelines that need the canonical product set.
 */
export async function loadPublishedProductsForOutlet(
	client: DatabaseClient,
	{ organizationId, outletId }: { organizationId: string; outletId: string }
): Promise<Product[]> {
	const result = await client.query<AdminProductRow>(
		`
			SELECT
				p.id::text,
				p.outlet_id::text,
				p.catalog_id::text,
				p.section_id::text,
				cs.name AS section_name,
				p.name,
				p.local_name,
				p.description,
				p.price_amount,
				p.currency,
				p.image_url,
				p.spice_level,
				p.is_available,
				p.is_signature,
				p.confidence,
				p.sort_order,
				p.source_metadata,
				COALESCE(
					ARRAY_AGG(DISTINCT pdf.flag_code) FILTER (WHERE pdf.flag_code IS NOT NULL),
					ARRAY[]::text[]
				) AS dietary_flags,
				COALESCE(
					ARRAY_AGG(DISTINCT pa.allergen_code) FILTER (WHERE pa.allergen_code IS NOT NULL),
					ARRAY[]::text[]
				) AS allergens
			FROM products p
			JOIN catalogs c ON c.id = p.catalog_id
			JOIN catalog_sections cs ON cs.id = p.section_id
			LEFT JOIN product_dietary_flags pdf ON pdf.product_id = p.id
			LEFT JOIN product_allergens pa ON pa.product_id = p.id
			WHERE p.outlet_id = $1::uuid
				AND p.organization_id = $2::uuid
				AND c.status = 'published'
				AND p.is_available = true
			GROUP BY p.id, cs.name
			ORDER BY p.sort_order, p.name
		`,
		[outletId, organizationId]
	);

	return result.rows.map(mapRowToProduct);
}

// ---------------------------------------------------------------------------
// Backward-compat shims — map old restaurant/menu API to new outlet/catalog API
//
// Mapping:
//   restaurantId  → outletId
//   menu          → catalog  (catalogs table)
//   menu_category → section  (catalog_sections table)
//   menu_item     → product  (products table)
//
// Remove after all callers migrate to the new names.
// ---------------------------------------------------------------------------

import type { MenuItem } from '$lib/domain/menu/types';
import { query as dbQuery } from '$lib/server/db/postgres';

/** Converts a Product to the legacy MenuItem shape. */
export function productToMenuItem(p: Product): MenuItem {
	return {
		id: p.id,
		category: p.section,
		name: p.name,
		localName: p.localName,
		description: p.description,
		price: p.price,
		currency: p.currency,
		image: p.imageUrl,
		spiceLevel: 0, // products table has no spice_level column
		isAvailable: p.isAvailable,
		isSignature: p.isSignature,
		dietaryFlags: p.dietaryFlags,
		allergens: p.allergens,
		goodFor: p.goodFor,
		confidence: p.confidence
	};
}

/** @deprecated Use getProductById */
export async function findMenuItemById(
	client: DatabaseClient,
	params: { organizationId: string; restaurantId: string; itemId: string }
): Promise<MenuItem | null> {
	const product = await getProductById(client, {
		organizationId: params.organizationId,
		outletId: params.restaurantId,
		productId: params.itemId
	});
	return product ? productToMenuItem(product) : null;
}

/** @deprecated Use loadCatalogsForOutlet */
export async function loadMenusForRestaurant(
	client: DatabaseClient,
	params: { organizationId: string; restaurantId: string }
): Promise<{ id: string; status: string; version: number }[]> {
	return loadCatalogsForOutlet(client, {
		organizationId: params.organizationId,
		outletId: params.restaurantId
	});
}

/** @deprecated Use loadProductsForCatalog — returns count */
export async function countMenuItems(
	client: DatabaseClient,
	params: { organizationId: string; restaurantId: string; menuId: string }
): Promise<number> {
	const products = await loadProductsForCatalog(client, {
		organizationId: params.organizationId,
		outletId: params.restaurantId,
		catalogId: params.menuId
	});
	return products.length;
}

/** @deprecated Use loadProductsForCatalog */
export async function loadMenuItemsForMenu(
	client: DatabaseClient,
	params: { organizationId: string; restaurantId: string; menuId: string }
): Promise<MenuItem[]> {
	const products = await loadProductsForCatalog(client, {
		organizationId: params.organizationId,
		outletId: params.restaurantId,
		catalogId: params.menuId
	});
	return products.map(productToMenuItem);
}

/** @deprecated Creates a draft catalog (menu equivalent) */
export async function createDraftMenu(
	client: DatabaseClient,
	params: { organizationId: string; restaurantId: string; version: number; sourceType: string }
): Promise<string> {
	const result = await client.query<{ id: string }>(
		`INSERT INTO catalogs (organization_id, outlet_id, name, status, sort_order)
		 VALUES ($1::uuid, $2::uuid, $3, 'draft', $4)
		 RETURNING id::text`,
		[params.organizationId, params.restaurantId, `Draft Catalog v${params.version}`, params.version]
	);
	const row = result.rows[0];
	if (!row) throw new Error('Failed to create draft catalog');
	return row.id;
}

/** @deprecated Finds or creates a catalog section by name */
export async function ensureCategory(
	client: DatabaseClient,
	params: { organizationId: string; restaurantId: string; menuId: string; name: string }
): Promise<string> {
	const existing = await client.query<{ id: string }>(
		`SELECT id::text FROM catalog_sections
		 WHERE catalog_id = $1::uuid AND organization_id = $2::uuid AND name = $3
		 LIMIT 1`,
		[params.menuId, params.organizationId, params.name]
	);
	if (existing.rows[0]) return existing.rows[0].id;

	const inserted = await client.query<{ id: string }>(
		`INSERT INTO catalog_sections (organization_id, outlet_id, catalog_id, name, sort_order)
		 VALUES ($1::uuid, $2::uuid, $3::uuid, $4, 0)
		 RETURNING id::text`,
		[params.organizationId, params.restaurantId, params.menuId, params.name]
	);
	const row = inserted.rows[0];
	if (!row) throw new Error(`Failed to create catalog section "${params.name}"`);
	return row.id;
}

/** @deprecated Use createProduct */
export async function insertMenuItem(
	client: DatabaseClient,
	params: {
		organizationId: string;
		restaurantId: string;
		menuId: string;
		categoryId: string;
		name: string;
		localName?: string;
		description?: string;
		price: number;
		spiceLevel?: number;
		isSignature?: boolean;
		dietaryFlags?: string[];
		allergens?: string[];
		sourceMetadata?: Record<string, unknown>;
		sortOrder?: number;
	}
): Promise<MenuItem> {
	const product = await createProduct(client, {
		organizationId: params.organizationId,
		outletId: params.restaurantId,
		catalogId: params.menuId,
		sectionId: params.categoryId,
		data: {
			name: params.name,
			localName: params.localName,
			description: params.description,
			priceAmount: params.price,
			spiceLevel: params.spiceLevel ?? 0,
			isSignature: params.isSignature ?? false,
			confidence: 'needs-review',
			sortOrder: params.sortOrder ?? 0
		}
	});
	if (!product) throw new Error(`Failed to insert product "${params.name}"`);

	if ((params.dietaryFlags?.length ?? 0) > 0 || (params.allergens?.length ?? 0) > 0) {
		await updateProductFlags(client, {
			organizationId: params.organizationId,
			outletId: params.restaurantId,
			productId: product.id,
			dietaryFlags: params.dietaryFlags ?? [],
			allergens: params.allergens ?? []
		});
	}
	return productToMenuItem(product);
}

/** @deprecated Use updateProduct */
export async function updateMenuItem(
	client: DatabaseClient,
	params: {
		organizationId: string;
		restaurantId: string;
		itemId: string;
		data: Partial<{
			name: string;
			localName: string | null;
			description: string;
			priceAmount: number;
			imageUrl: string;
			spiceLevel: number;
			isAvailable: boolean;
			isSignature: boolean;
			confidence: string;
		}>;
	}
): Promise<MenuItem | null> {
	const product = await updateProduct(client, {
		organizationId: params.organizationId,
		outletId: params.restaurantId,
		productId: params.itemId,
		data: params.data
	});
	return product ? productToMenuItem(product) : null;
}

/** @deprecated Use setProductAvailability */
export async function setMenuItemAvailability(
	client: DatabaseClient,
	params: { organizationId: string; restaurantId: string; itemId: string; isAvailable: boolean }
): Promise<boolean> {
	return setProductAvailability(client, {
		organizationId: params.organizationId,
		outletId: params.restaurantId,
		productId: params.itemId,
		isAvailable: params.isAvailable
	});
}

/** @deprecated Use updateProductFlags */
export async function updateMenuItemFlags(
	client: DatabaseClient,
	params: {
		organizationId: string;
		restaurantId: string;
		itemId: string;
		dietaryFlags: string[];
		allergens: string[];
	}
): Promise<void> {
	return updateProductFlags(client, {
		organizationId: params.organizationId,
		outletId: params.restaurantId,
		productId: params.itemId,
		dietaryFlags: params.dietaryFlags,
		allergens: params.allergens
	});
}

/** @deprecated Use publishCatalog */
export async function publishMenu(
	client: DatabaseClient,
	params: { organizationId: string; restaurantId: string; menuId: string }
): Promise<string | null> {
	return publishCatalog(client, {
		organizationId: params.organizationId,
		outletId: params.restaurantId,
		catalogId: params.menuId
	});
}

/** @deprecated Use loadPublishedProductsForOutlet */
export async function loadMenuItemsForRestaurant(
	outletId: string,
	organizationId: string
): Promise<MenuItem[]> {
	const result = await dbQuery<AdminProductRow>(
		`SELECT
			p.id::text, p.outlet_id::text, p.catalog_id::text, p.section_id::text,
			cs.name AS section_name, p.name, p.local_name, p.description,
		p.price_amount, p.currency, p.image_url, 0 AS spice_level,
		p.is_available, p.is_signature, p.confidence, p.sort_order, p.source_metadata,
		COALESCE(ARRAY_AGG(DISTINCT pdf.flag_code) FILTER (WHERE pdf.flag_code IS NOT NULL), ARRAY[]::text[]) AS dietary_flags,
		COALESCE(ARRAY_AGG(DISTINCT pa.allergen_code) FILTER (WHERE pa.allergen_code IS NOT NULL), ARRAY[]::text[]) AS allergens
	 FROM products p
	 JOIN catalogs c ON c.id = p.catalog_id
	 JOIN catalog_sections cs ON cs.id = p.section_id
	 LEFT JOIN product_dietary_flags pdf ON pdf.product_id = p.id
	 LEFT JOIN product_allergens pa ON pa.product_id = p.id
	 WHERE p.outlet_id = $1::uuid AND p.organization_id = $2::uuid AND c.status = 'published'
		 GROUP BY p.id, cs.name
		 ORDER BY p.sort_order, p.name`,
		[outletId, organizationId]
	);
	return result.rows.map((row) => productToMenuItem(mapRowToProduct(row)));
}
