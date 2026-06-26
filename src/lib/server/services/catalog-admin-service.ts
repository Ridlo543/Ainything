/**
 * catalog-admin-service.ts — Service layer for catalog and product management.
 *
 * Orchestrates domain validation, tenant resolution, and repository calls for
 * the new outlets/catalogs/products schema (migration 0022).
 *
 * Pattern mirrors menu-admin-service.ts:
 *  - Tenant scope is ALWAYS derived from server-side TenantContext.
 *  - Every write runs inside withUserContext so RLS policies evaluate.
 *  - Input validation (Zod) happens at the form action layer.
 */

import type { AuthUser } from '$lib/domain/auth/types';
import type { Catalog, CatalogSection, Product } from '$lib/domain/outlet/types';
import type { CatalogInput, CatalogSectionInput, ProductInput } from '$lib/domain/outlet/schema';
import { withUserContext } from '$lib/server/db/postgres';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';
import {
	getOutletById,
	listCatalogsForOutlet,
	listSectionsForCatalog
} from '$lib/server/repositories/outlet-repository';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class CatalogNotFoundError extends Error {
	constructor(id: string) {
		super(`Catalog not found or access denied: ${id}`);
		this.name = 'CatalogNotFoundError';
	}
}

export class ProductNotFoundError extends Error {
	constructor(id: string) {
		super(`Product not found or access denied: ${id}`);
		this.name = 'ProductNotFoundError';
	}
}

export class CatalogPermissionError extends Error {
	constructor(action: string) {
		super(`Permission denied: ${action} requires owner or manager role`);
		this.name = 'CatalogPermissionError';
	}
}

// ---------------------------------------------------------------------------
// Catalog reads
// ---------------------------------------------------------------------------

export async function listCatalogs(user: AuthUser, outletId: string): Promise<Catalog[]> {
	const tenant = await resolveTenantContext(user);
	return listCatalogsForOutlet(outletId, tenant.organization.id);
}

export async function listSections(user: AuthUser, catalogId: string): Promise<CatalogSection[]> {
	const tenant = await resolveTenantContext(user);
	return listSectionsForCatalog(catalogId, tenant.organization.id);
}

// ---------------------------------------------------------------------------
// Catalog writes
// ---------------------------------------------------------------------------

/**
 * Creates a new catalog for an outlet. Drafts only — publish via publishCatalog().
 * Owner and manager roles are allowed.
 */
export async function createCatalog(
	user: AuthUser,
	outletId: string,
	input: CatalogInput
): Promise<Catalog> {
	const tenant = await resolveTenantContext(user);

	if (tenant.membership.role === 'staff') {
		throw new CatalogPermissionError('create catalog');
	}

	const outlet = await getOutletById(outletId, tenant.organization.id);
	if (!outlet) {
		throw new CatalogNotFoundError(outletId);
	}

	return withUserContext(user.id, async (client) => {
		const result = await client.query<{
			id: string;
			outlet_id: string;
			organization_id: string;
			name: string;
			status: string;
			sort_order: number;
			created_at: string;
			updated_at: string;
		}>(
			`
				INSERT INTO catalogs (organization_id, outlet_id, name, status, sort_order)
				VALUES ($1::uuid, $2::uuid, $3, 'draft', $4)
				RETURNING id::text, outlet_id::text, organization_id::text,
				          name, status, sort_order, created_at::text, updated_at::text
			`,
			[tenant.organization.id, outletId, input.name, input.sortOrder ?? 0]
		);
		const row = result.rows[0];
		return {
			id: row.id,
			outletId: row.outlet_id,
			organizationId: row.organization_id,
			name: row.name,
			status: row.status as Catalog['status'],
			sortOrder: row.sort_order,
			createdAt: row.created_at,
			updatedAt: row.updated_at
		};
	});
}

/**
 * Publishes a catalog (sets status = 'published').
 * Only one catalog can be published at a time per outlet — this unpublishes any
 * other currently published catalog for that outlet.
 */
export async function publishCatalog(
	user: AuthUser,
	catalogId: string,
	outletId: string
): Promise<void> {
	const tenant = await resolveTenantContext(user);

	if (tenant.membership.role === 'staff') {
		throw new CatalogPermissionError('publish catalog');
	}

	await withUserContext(user.id, async (client) => {
		// Unpublish any existing published catalog for this outlet.
		await client.query(
			`UPDATE catalogs SET status = 'archived', updated_at = now()
			 WHERE outlet_id = $1::uuid AND organization_id = $2::uuid AND status = 'published'`,
			[outletId, tenant.organization.id]
		);

		// Publish the target catalog.
		const result = await client.query(
			`UPDATE catalogs SET status = 'published', updated_at = now()
			 WHERE id = $1::uuid AND organization_id = $2::uuid
			 RETURNING id`,
			[catalogId, tenant.organization.id]
		);

		if (result.rowCount === 0) {
			throw new CatalogNotFoundError(catalogId);
		}
	});
}

// ---------------------------------------------------------------------------
// Catalog section writes
// ---------------------------------------------------------------------------

/**
 * Creates a new section within a catalog.
 */
export async function createSection(
	user: AuthUser,
	params: { catalogId: string; outletId: string },
	input: CatalogSectionInput
): Promise<CatalogSection> {
	const tenant = await resolveTenantContext(user);

	if (tenant.membership.role === 'staff') {
		throw new CatalogPermissionError('create catalog section');
	}

	return withUserContext(user.id, async (client) => {
		const result = await client.query<{
			id: string;
			catalog_id: string;
			outlet_id: string;
			organization_id: string;
			name: string;
			description: string;
			image_url: string;
			sort_order: number;
		}>(
			`
				INSERT INTO catalog_sections
				  (organization_id, outlet_id, catalog_id, name, description, image_url, sort_order)
				VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7)
				RETURNING id::text, catalog_id::text, outlet_id::text, organization_id::text,
				          name, COALESCE(description,'') AS description,
				          COALESCE(image_url,'') AS image_url, sort_order
			`,
			[
				tenant.organization.id,
				params.outletId,
				params.catalogId,
				input.name,
				input.description ?? '',
				input.imageUrl ?? '',
				input.sortOrder ?? 0
			]
		);
		const row = result.rows[0];
		return {
			id: row.id,
			catalogId: row.catalog_id,
			outletId: row.outlet_id,
			organizationId: row.organization_id,
			name: row.name,
			description: row.description,
			imageUrl: row.image_url,
			sortOrder: row.sort_order
		};
	});
}

// ---------------------------------------------------------------------------
// Product writes
// ---------------------------------------------------------------------------

type ProductRow = {
	id: string;
	outlet_id: string;
	catalog_id: string;
	section_id: string | null;
	organization_id: string;
	/** Section name string from JOIN on catalog_sections (used as display label in Product). */
	section: string;
	name: string;
	local_name: string | null;
	description: string;
	price_amount: number;
	currency: string;
	image_url: string;
	is_available: boolean;
	is_signature: boolean;
	sort_order: number;
	confidence: string;
	dietary_flags: string[];
	allergens: string[];
	good_for: string[];
};

function mapProductRow(row: ProductRow): Product {
	return {
		id: row.id,
		// Product domain type uses 'section' (display name string), not outletId/catalogId.
		// The DB row fields outlet_id, catalog_id, section_id, organization_id are kept
		// on ProductRow for write ops; the domain type only exposes what the UI needs.
		section: row.section_id ?? '',
		name: row.name,
		localName: row.local_name ?? undefined,
		description: row.description,
		price: row.price_amount,
		currency: 'IDR',
		imageUrl: row.image_url,
		isAvailable: row.is_available,
		isSignature: row.is_signature,
		sortOrder: row.sort_order,
		confidence: row.confidence as Product['confidence'],
		dietaryFlags: (row.dietary_flags ?? []) as Product['dietaryFlags'],
		allergens: (row.allergens ?? []) as Product['allergens'],
		goodFor: row.good_for ?? []
	};
}

/**
 * Creates a new product in a catalog (and optionally a section).
 * Owner and manager roles are allowed.
 */
export async function createProduct(
	user: AuthUser,
	params: { outletId: string; catalogId: string; sectionId?: string },
	input: ProductInput
): Promise<Product> {
	const tenant = await resolveTenantContext(user);

	if (tenant.membership.role === 'staff') {
		throw new CatalogPermissionError('create product');
	}

	return withUserContext(user.id, async (client) => {
		// Insert product row.
		const result = await client.query<ProductRow>(
			`
				INSERT INTO products (
					organization_id, outlet_id, catalog_id, section_id,
					name, local_name, description, price_amount, currency,
					image_url, is_available, is_signature, sort_order, confidence
				)
				VALUES (
					$1::uuid, $2::uuid, $3::uuid, $4::uuid,
					$5, $6, $7, $8, $9,
					$10, $11, $12, $13, $14
				)
				RETURNING id::text, outlet_id::text, catalog_id::text,
				          section_id::text, organization_id::text,
				          name, local_name, COALESCE(description,'') AS description,
				          price_amount, currency, COALESCE(image_url,'') AS image_url,
				          is_available, is_signature, sort_order, confidence,
				          ARRAY[]::text[] AS dietary_flags,
				          ARRAY[]::text[] AS allergens,
				          ARRAY[]::text[] AS good_for
			`,
			[
				tenant.organization.id,
				params.outletId,
				params.catalogId,
				params.sectionId ?? null,
				input.name,
				input.localName ?? null,
				input.description ?? '',
				input.price,
				input.currency ?? 'IDR',
				input.imageUrl ?? '',
				input.isAvailable ?? true,
				input.isSignature ?? false,
				input.sortOrder ?? 0,
				input.confidence ?? 'needs-review'
			]
		);

		const product = result.rows[0];

		// Insert dietary flags and allergens if provided.
		if (input.dietaryFlags?.length) {
			await client.query(
				`INSERT INTO product_dietary_flags (product_id, flag_code)
				 SELECT $1::uuid, unnest($2::text[])`,
				[product.id, input.dietaryFlags]
			);
		}
		if (input.allergens?.length) {
			await client.query(
				`INSERT INTO product_allergens (product_id, allergen_code)
				 SELECT $1::uuid, unnest($2::text[])`,
				[product.id, input.allergens]
			);
		}

		// Re-read with flags for complete return value.
		const full = await client.query<ProductRow>(
			`
				SELECT p.id::text, p.outlet_id::text, p.catalog_id::text,
				       p.section_id::text, p.organization_id::text,
				       p.name, p.local_name, COALESCE(p.description,'') AS description,
				       p.price_amount, p.currency, COALESCE(p.image_url,'') AS image_url,
				       p.is_available, p.is_signature, p.sort_order, p.confidence,
				       COALESCE(ARRAY_AGG(DISTINCT pdf.flag_code) FILTER (WHERE pdf.flag_code IS NOT NULL), ARRAY[]::text[]) AS dietary_flags,
				       COALESCE(ARRAY_AGG(DISTINCT pa.allergen_code) FILTER (WHERE pa.allergen_code IS NOT NULL), ARRAY[]::text[]) AS allergens,
				       ARRAY[]::text[] AS good_for
				FROM products p
				LEFT JOIN product_dietary_flags pdf ON pdf.product_id = p.id
				LEFT JOIN product_allergens pa ON pa.product_id = p.id
				WHERE p.id = $1::uuid
				GROUP BY p.id, p.outlet_id, p.catalog_id, p.section_id, p.organization_id,
				         p.name, p.local_name, p.description, p.price_amount, p.currency,
				         p.image_url, p.is_available, p.is_signature, p.sort_order, p.confidence
			`,
			[product.id]
		);

		return mapProductRow(full.rows[0]);
	});
}

/**
 * Updates a product's scalar fields and replaces its dietary flags/allergens.
 * Owner and manager roles are allowed.
 */
export async function updateProduct(
	user: AuthUser,
	productId: string,
	outletId: string,
	input: Partial<ProductInput>
): Promise<Product> {
	const tenant = await resolveTenantContext(user);

	if (tenant.membership.role === 'staff') {
		throw new CatalogPermissionError('update product');
	}

	return withUserContext(user.id, async (client) => {
		const fields: string[] = [];
		const values: (string | number | boolean | null)[] = [];
		let idx = 1;

		if (input.name !== undefined) {
			fields.push(`name = $${idx++}`);
			values.push(input.name);
		}
		if (input.localName !== undefined) {
			fields.push(`local_name = $${idx++}`);
			values.push(input.localName);
		}
		if (input.description !== undefined) {
			fields.push(`description = $${idx++}`);
			values.push(input.description);
		}
		if (input.price !== undefined) {
			fields.push(`price_amount = $${idx++}`);
			values.push(input.price);
		}
		if (input.imageUrl !== undefined) {
			fields.push(`image_url = $${idx++}`);
			values.push(input.imageUrl);
		}
		if (input.isAvailable !== undefined) {
			fields.push(`is_available = $${idx++}`);
			values.push(input.isAvailable);
		}
		if (input.isSignature !== undefined) {
			fields.push(`is_signature = $${idx++}`);
			values.push(input.isSignature);
		}
		if (input.confidence !== undefined) {
			fields.push(`confidence = $${idx++}`);
			values.push(input.confidence);
		}
		if (input.sortOrder !== undefined) {
			fields.push(`sort_order = $${idx++}`);
			values.push(input.sortOrder);
		}

		if (fields.length > 0) {
			fields.push(`updated_at = now()`);
			values.push(productId, tenant.organization.id);

			const updateResult = await client.query(
				`UPDATE products SET ${fields.join(', ')}
				 WHERE id = $${idx}::uuid AND organization_id = $${idx + 1}::uuid
				 RETURNING id`,
				values
			);

			if (updateResult.rowCount === 0) {
				throw new ProductNotFoundError(productId);
			}
		}

		// Replace flags if provided.
		if (input.dietaryFlags !== undefined) {
			await client.query(`DELETE FROM product_dietary_flags WHERE product_id = $1::uuid`, [
				productId
			]);
			if (input.dietaryFlags.length > 0) {
				await client.query(
					`INSERT INTO product_dietary_flags (product_id, flag_code)
					 SELECT $1::uuid, unnest($2::text[])`,
					[productId, input.dietaryFlags]
				);
			}
		}
		if (input.allergens !== undefined) {
			await client.query(`DELETE FROM product_allergens WHERE product_id = $1::uuid`, [productId]);
			if (input.allergens.length > 0) {
				await client.query(
					`INSERT INTO product_allergens (product_id, allergen_code)
					 SELECT $1::uuid, unnest($2::text[])`,
					[productId, input.allergens]
				);
			}
		}

		// Re-read full product with flags.
		const full = await client.query<ProductRow>(
			`
				SELECT p.id::text, p.outlet_id::text, p.catalog_id::text,
				       p.section_id::text, p.organization_id::text,
				       p.name, p.local_name, COALESCE(p.description,'') AS description,
				       p.price_amount, p.currency, COALESCE(p.image_url,'') AS image_url,
				       p.is_available, p.is_signature, p.sort_order, p.confidence,
				       COALESCE(ARRAY_AGG(DISTINCT pdf.flag_code) FILTER (WHERE pdf.flag_code IS NOT NULL), ARRAY[]::text[]) AS dietary_flags,
				       COALESCE(ARRAY_AGG(DISTINCT pa.allergen_code) FILTER (WHERE pa.allergen_code IS NOT NULL), ARRAY[]::text[]) AS allergens,
				       ARRAY[]::text[] AS good_for
				FROM products p
				LEFT JOIN product_dietary_flags pdf ON pdf.product_id = p.id
				LEFT JOIN product_allergens pa ON pa.product_id = p.id
				WHERE p.id = $1::uuid
				GROUP BY p.id, p.outlet_id, p.catalog_id, p.section_id, p.organization_id,
				         p.name, p.local_name, p.description, p.price_amount, p.currency,
				         p.image_url, p.is_available, p.is_signature, p.sort_order, p.confidence
			`,
			[productId]
		);

		if (!full.rows[0]) {
			throw new ProductNotFoundError(productId);
		}

		return mapProductRow(full.rows[0]);
	});
}

/**
 * Toggles a product's availability status.
 */
export async function setProductAvailability(
	user: AuthUser,
	productId: string,
	isAvailable: boolean
): Promise<void> {
	const tenant = await resolveTenantContext(user);

	await withUserContext(user.id, async (client) => {
		const result = await client.query(
			`UPDATE products SET is_available = $1, updated_at = now()
			 WHERE id = $2::uuid AND organization_id = $3::uuid
			 RETURNING id`,
			[isAvailable, productId, tenant.organization.id]
		);

		if (result.rowCount === 0) {
			throw new ProductNotFoundError(productId);
		}
	});
}
