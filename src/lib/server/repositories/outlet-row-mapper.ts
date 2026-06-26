/**
 * Row mapper for outlets and related entities.
 *
 * Converts raw PostgreSQL rows (snake_case) to domain types (camelCase).
 * Mirrors menu-row-mapper.ts but targets the new outlets/* tables from
 * migration 0022_generalize_to_outlets.sql.
 */

import type {
	Allergen,
	BusinessType,
	Catalog,
	CatalogSection,
	DietaryFlag,
	Outlet,
	Product,
	ProductImportIssue,
	ProductSourceType
} from '$lib/domain/outlet/types';
import type { LanguageTag } from '$lib/domain/menu/types';
import type { DatabaseClient } from '$lib/server/db/postgres';

// ---------------------------------------------------------------------------
// Raw DB row types
// ---------------------------------------------------------------------------

export type OutletRow = {
	id: string;
	organization_id: string;
	name: string;
	slug: string;
	public_host: string;
	location: string;
	business_type: BusinessType;
	status: Outlet['status'];
	language_tags: LanguageTag[];
	default_language_tag: LanguageTag;
	timezone: string;
	hero_image_url: string;
	table_count: number;
	description: string;
	knowledge_highlights: string[];
	analytics: Outlet['analytics'];
	settings: {
		checkout_mode?: string;
		require_buyer_whatsapp?: boolean;
		payment_confirmation_enabled?: boolean;
	} | null;
};

export type CatalogRow = {
	id: string;
	outlet_id: string;
	organization_id: string;
	name: string;
	status: Catalog['status'];
	sort_order: number;
	created_at: string;
	updated_at: string;
};

export type CatalogSectionRow = {
	id: string;
	catalog_id: string;
	outlet_id: string;
	organization_id: string;
	name: string;
	description: string;
	image_url: string;
	sort_order: number;
};

export type ProductRow = {
	id: string;
	outlet_id: string;
	section: string;
	name: string;
	local_name: string | null;
	description: string;
	price_amount: number;
	currency: Product['currency'];
	image_url: string;
	is_available: boolean;
	is_signature: boolean;
	sort_order: number;
	confidence: Product['confidence'];
	good_for: string[];
	dietary_flags: DietaryFlag[];
	allergens: Allergen[];
};

export type ImportIssueRow = {
	id: string;
	outlet_id: string;
	source_type: ProductSourceType;
	label: string;
	confidence: string;
	issue: string;
	status: ProductImportIssue['status'];
};

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export function mapOutletRow(outlet: OutletRow, analytics?: Outlet['analytics']): Outlet {
	const s = outlet.settings ?? {};
	return {
		id: outlet.id,
		organizationId: outlet.organization_id,
		name: outlet.name,
		slug: outlet.slug,
		publicHost: outlet.public_host,
		location: outlet.location,
		businessType: outlet.business_type,
		status: outlet.status,
		languages: outlet.language_tags,
		timezone: outlet.timezone ?? 'Asia/Jakarta',
		defaultLanguageTag: outlet.default_language_tag ?? 'id',
		heroImage: outlet.hero_image_url,
		tableCount: outlet.table_count,
		description: outlet.description,
		knowledgeHighlights: outlet.knowledge_highlights ?? [],
		analytics: analytics ??
			outlet.analytics ?? {
				scansToday: 0,
				helpfulRate: 0,
				fallbackRate: 0,
				topQuestion: '',
				topItem: ''
			},
		checkoutSettings: {
			checkoutMode: (s.checkout_mode as 'offline' | 'online') ?? 'offline',
			requireBuyerWhatsapp: s.require_buyer_whatsapp ?? false,
			paymentConfirmationEnabled: s.payment_confirmation_enabled ?? false
		}
	};
}

export function mapCatalogRow(row: CatalogRow): Catalog {
	return {
		id: row.id,
		outletId: row.outlet_id,
		organizationId: row.organization_id,
		name: row.name,
		status: row.status,
		sortOrder: row.sort_order,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

export function mapCatalogSectionRow(row: CatalogSectionRow): CatalogSection {
	return {
		id: row.id,
		catalogId: row.catalog_id,
		outletId: row.outlet_id,
		organizationId: row.organization_id,
		name: row.name,
		description: row.description ?? '',
		imageUrl: row.image_url ?? '',
		sortOrder: row.sort_order
	};
}

// ---------------------------------------------------------------------------
// Batch loaders (used by tenant-repository and public-catalog-repository)
// ---------------------------------------------------------------------------

/**
 * Load published catalog section names for a set of outlet IDs.
 * Returns a map of outletId → section name list (sorted).
 * Used by the admin tenant dashboard (lightweight, names only).
 */
export async function loadPublishedSections(
	client: DatabaseClient,
	outletIds: string[]
): Promise<Map<string, string[]>> {
	if (outletIds.length === 0) return new Map();

	const result = await client.query<{ outlet_id: string; name: string }>(
		`
			SELECT DISTINCT cs.outlet_id::text, cs.name, cs.sort_order
			FROM catalog_sections cs
			JOIN catalogs c ON c.id = cs.catalog_id
			WHERE cs.outlet_id = ANY($1::uuid[])
			  AND c.status = 'published'
			ORDER BY cs.outlet_id::text, cs.sort_order, cs.name
		`,
		[outletIds]
	);

	const map = new Map<string, string[]>();
	for (const row of result.rows) {
		map.set(row.outlet_id, [...(map.get(row.outlet_id) ?? []), row.name]);
	}
	return map;
}

/**
 * Load full published CatalogSection objects for a set of outlet IDs.
 * Returns a map of outletId → CatalogSection list (sorted).
 * Used by the public buyer flow where section metadata (image, description) is needed.
 */
export async function loadPublishedSectionsFull(
	client: DatabaseClient,
	outletIds: string[]
): Promise<Map<string, CatalogSection[]>> {
	if (outletIds.length === 0) return new Map();

	const result = await client.query<CatalogSectionRow>(
		`
			SELECT cs.id::text, cs.catalog_id::text, cs.outlet_id::text,
			       cs.organization_id::text, cs.name,
			       COALESCE(cs.description, '') AS description,
			       COALESCE(cs.image_url, '') AS image_url,
			       cs.sort_order
			FROM catalog_sections cs
			JOIN catalogs c ON c.id = cs.catalog_id
			WHERE cs.outlet_id = ANY($1::uuid[])
			  AND c.status = 'published'
			ORDER BY cs.outlet_id::text, cs.sort_order, cs.name
		`,
		[outletIds]
	);

	const map = new Map<string, CatalogSection[]>();
	for (const row of result.rows) {
		const section = mapCatalogSectionRow(row);
		map.set(row.outlet_id, [...(map.get(row.outlet_id) ?? []), section]);
	}
	return map;
}

/**
 * Load published products for a set of outlet IDs.
 * Returns a map of outletId → Product list (sorted by sort_order, name).
 */
export async function loadPublishedProducts(
	client: DatabaseClient,
	outletIds: string[]
): Promise<Map<string, Product[]>> {
	if (outletIds.length === 0) return new Map();

	const result = await client.query<ProductRow>(
		`
			SELECT
				p.id::text,
				p.outlet_id::text,
				cs.name AS section,
				p.name,
				p.local_name,
				p.description,
				p.price_amount,
				p.currency,
				p.image_url,
				p.is_available,
				p.is_signature,
				p.sort_order,
				p.confidence,
				COALESCE(p.source_metadata->'goodFor', '[]'::jsonb) AS good_for,
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
			WHERE p.outlet_id = ANY($1::uuid[])
			  AND c.status = 'published'
			GROUP BY p.id, cs.name
			ORDER BY p.outlet_id::text, p.sort_order, p.name
		`,
		[outletIds]
	);

	const items = new Map<string, Product[]>();
	for (const row of result.rows) {
		const product: Product = {
			id: row.id,
			section: row.section,
			name: row.name,
			localName: row.local_name ?? undefined,
			description: row.description,
			price: row.price_amount,
			currency: row.currency,
			imageUrl: row.image_url,
			isAvailable: row.is_available,
			isSignature: row.is_signature,
			sortOrder: row.sort_order,
			dietaryFlags: row.dietary_flags,
			allergens: row.allergens,
			goodFor: row.good_for,
			confidence: row.confidence
		};
		items.set(row.outlet_id, [...(items.get(row.outlet_id) ?? []), product]);
	}
	return items;
}

/**
 * Load product import issues for a set of outlet IDs.
 * Returns a map of outletId → ProductImportIssue list.
 */
export async function loadProductImportIssues(
	client: DatabaseClient,
	outletIds: string[]
): Promise<Map<string, ProductImportIssue[]>> {
	if (outletIds.length === 0) return new Map();

	const result = await client.query<ImportIssueRow>(
		`
			SELECT
				id::text,
				outlet_id::text,
				source_type,
				label,
				confidence::text,
				issue,
				status
			FROM product_import_issues
			WHERE outlet_id = ANY($1::uuid[])
			ORDER BY created_at DESC
		`,
		[outletIds]
	);

	const issues = new Map<string, ProductImportIssue[]>();
	for (const row of result.rows) {
		const issue: ProductImportIssue = {
			id: row.id,
			sourceType: row.source_type,
			label: row.label,
			confidence: Number(row.confidence),
			issue: row.issue,
			status: row.status
		};
		issues.set(row.outlet_id, [...(issues.get(row.outlet_id) ?? []), issue]);
	}
	return issues;
}
