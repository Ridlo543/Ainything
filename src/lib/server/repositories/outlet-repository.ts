/**
 * Outlet repository — admin CRUD for outlets, catalogs, catalog sections, products,
 * outlet tables, and outlet settings.
 *
 * All writes are scoped by BOTH organization_id AND outlet_id (defense-in-depth,
 * on top of RLS). Reads use the ainything_app role (RLS enforced).
 */

import type {
	Catalog,
	CatalogSection,
	Outlet,
	OutletTable,
	Product,
	ProductImportIssue
} from '$lib/domain/outlet/types';
import type { CreateOutletInput, UpdateOutletInput } from '$lib/domain/outlet/schema';
import { query, withTransaction } from '$lib/server/db/postgres';
import {
	mapOutletRow,
	mapCatalogRow,
	mapCatalogSectionRow,
	loadPublishedSections,
	loadPublishedProducts,
	loadProductImportIssues,
	type OutletRow,
	type CatalogRow,
	type CatalogSectionRow
} from '$lib/server/repositories/outlet-row-mapper';

// ---------------------------------------------------------------------------
// Outlets
// ---------------------------------------------------------------------------

export async function getOutletById(
	outletId: string,
	organizationId: string
): Promise<Outlet | null> {
	const result = await query<OutletRow>(
		`
			SELECT
				id::text, organization_id::text, name, slug,
				COALESCE(public_host, '') AS public_host,
				COALESCE(location, '') AS location,
				business_type,
				COALESCE(language_tags, ARRAY['id']) AS language_tags,
				COALESCE(default_language_tag, 'id') AS default_language_tag,
				COALESCE(timezone, 'Asia/Jakarta') AS timezone,
				COALESCE(hero_image_url, '') AS hero_image_url,
				COALESCE(table_count, 0) AS table_count,
				COALESCE(description, '') AS description,
				COALESCE(knowledge_highlights, ARRAY[]::text[]) AS knowledge_highlights,
				COALESCE(analytics, '{}'::jsonb) AS analytics,
				COALESCE(settings, '{}'::jsonb) AS settings
			FROM outlets
			WHERE id = $1::uuid
			  AND organization_id = $2::uuid
			  AND status = 'active'
		`,
		[outletId, organizationId]
	);
	return result.rows[0] ? mapOutletRow(result.rows[0]) : null;
}

export async function listOutlets(organizationId: string): Promise<Outlet[]> {
	const result = await query<OutletRow>(
		`
			SELECT
				id::text, organization_id::text, name, slug,
				COALESCE(public_host, '') AS public_host,
				COALESCE(location, '') AS location,
				business_type,
				COALESCE(language_tags, ARRAY['id']) AS language_tags,
				COALESCE(default_language_tag, 'id') AS default_language_tag,
				COALESCE(timezone, 'Asia/Jakarta') AS timezone,
				COALESCE(hero_image_url, '') AS hero_image_url,
				COALESCE(table_count, 0) AS table_count,
				COALESCE(description, '') AS description,
				COALESCE(knowledge_highlights, ARRAY[]::text[]) AS knowledge_highlights,
				COALESCE(analytics, '{}'::jsonb) AS analytics,
				COALESCE(settings, '{}'::jsonb) AS settings
			FROM outlets
			WHERE organization_id = $1::uuid
			  AND status = 'active'
			ORDER BY name ASC
		`,
		[organizationId]
	);
	return result.rows.map((row) => mapOutletRow(row));
}

export async function createOutlet(
	organizationId: string,
	input: CreateOutletInput
): Promise<Outlet> {
	const result = await query<OutletRow>(
		`
			INSERT INTO outlets (
				organization_id, name, slug, business_type, location,
				description, default_language_tag, timezone, status
			)
			VALUES (
				$1::uuid, $2, $3, $4, $5, $6, $7, $8, 'active'
			)
			RETURNING
				id::text, organization_id::text, name, slug,
				COALESCE(public_host, '') AS public_host,
				COALESCE(location, '') AS location,
				business_type,
				COALESCE(language_tags, ARRAY['id']) AS language_tags,
				COALESCE(default_language_tag, 'id') AS default_language_tag,
				COALESCE(timezone, 'Asia/Jakarta') AS timezone,
				COALESCE(hero_image_url, '') AS hero_image_url,
				COALESCE(table_count, 0) AS table_count,
				COALESCE(description, '') AS description,
				COALESCE(knowledge_highlights, ARRAY[]::text[]) AS knowledge_highlights,
				COALESCE(analytics, '{}'::jsonb) AS analytics,
				COALESCE(settings, '{}'::jsonb) AS settings
		`,
		[
			organizationId,
			input.name,
			input.slug,
			input.businessType,
			input.location ?? '',
			input.description ?? '',
			input.defaultLanguageTag,
			input.timezone
		]
	);
	return mapOutletRow(result.rows[0]);
}

export async function updateOutlet(
	outletId: string,
	organizationId: string,
	input: Partial<UpdateOutletInput>
): Promise<Outlet | null> {
	const fields: string[] = [];
	const values: (string | number | boolean | null | string[])[] = [];
	let idx = 1;

	if (input.name !== undefined) {
		fields.push(`name = $${idx++}`);
		values.push(input.name);
	}
	if (input.slug !== undefined) {
		fields.push(`slug = $${idx++}`);
		values.push(input.slug);
	}
	if (input.businessType !== undefined) {
		fields.push(`business_type = $${idx++}`);
		values.push(input.businessType);
	}
	if (input.location !== undefined) {
		fields.push(`location = $${idx++}`);
		values.push(input.location);
	}
	if (input.description !== undefined) {
		fields.push(`description = $${idx++}`);
		values.push(input.description);
	}
	if (input.defaultLanguageTag !== undefined) {
		fields.push(`default_language_tag = $${idx++}`);
		values.push(input.defaultLanguageTag);
	}
	if (input.timezone !== undefined) {
		fields.push(`timezone = $${idx++}`);
		values.push(input.timezone);
	}

	if (fields.length === 0) return getOutletById(outletId, organizationId);

	fields.push(`updated_at = now()`);
	values.push(outletId, organizationId);

	const result = await query<OutletRow>(
		`
			UPDATE outlets
			SET ${fields.join(', ')}
			WHERE id = $${idx}::uuid AND organization_id = $${idx + 1}::uuid
			RETURNING
				id::text, organization_id::text, name, slug,
				COALESCE(public_host, '') AS public_host,
				COALESCE(location, '') AS location,
				business_type,
				COALESCE(language_tags, ARRAY['id']) AS language_tags,
				COALESCE(default_language_tag, 'id') AS default_language_tag,
				COALESCE(timezone, 'Asia/Jakarta') AS timezone,
				COALESCE(hero_image_url, '') AS hero_image_url,
				COALESCE(table_count, 0) AS table_count,
				COALESCE(description, '') AS description,
				COALESCE(knowledge_highlights, ARRAY[]::text[]) AS knowledge_highlights,
				COALESCE(analytics, '{}'::jsonb) AS analytics,
				COALESCE(settings, '{}'::jsonb) AS settings
		`,
		values
	);
	return result.rows[0] ? mapOutletRow(result.rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Outlet with full catalog data (admin view)
// ---------------------------------------------------------------------------

export async function getOutletWithCatalog(
	outletId: string,
	organizationId: string
): Promise<
	(Outlet & { sections: string[]; products: Product[]; importIssues: ProductImportIssue[] }) | null
> {
	const outlet = await getOutletById(outletId, organizationId);
	if (!outlet) return null;

	const [sectionsMap, productsMap, issuesMap] = await withTransaction(async (client) => {
		return Promise.all([
			loadPublishedSections(client, [outletId]),
			loadPublishedProducts(client, [outletId]),
			loadProductImportIssues(client, [outletId])
		]);
	});

	return {
		...outlet,
		sections: sectionsMap.get(outletId) ?? [],
		products: productsMap.get(outletId) ?? [],
		importIssues: issuesMap.get(outletId) ?? []
	};
}

// ---------------------------------------------------------------------------
// Catalogs
// ---------------------------------------------------------------------------

export async function listCatalogsForOutlet(
	outletId: string,
	organizationId: string
): Promise<Catalog[]> {
	const result = await query<CatalogRow>(
		`
			SELECT id::text, outlet_id::text, organization_id::text, name, status,
			       sort_order, created_at::text, updated_at::text
			FROM catalogs
			WHERE outlet_id = $1::uuid AND organization_id = $2::uuid
			ORDER BY sort_order ASC, name ASC
		`,
		[outletId, organizationId]
	);
	return result.rows.map(mapCatalogRow);
}

// ---------------------------------------------------------------------------
// Catalog sections
// ---------------------------------------------------------------------------

export async function listSectionsForCatalog(
	catalogId: string,
	organizationId: string
): Promise<CatalogSection[]> {
	const result = await query<CatalogSectionRow>(
		`
			SELECT id::text, catalog_id::text, outlet_id::text, organization_id::text,
			       name, COALESCE(description, '') AS description,
			       COALESCE(image_url, '') AS image_url, sort_order
			FROM catalog_sections
			WHERE catalog_id = $1::uuid AND organization_id = $2::uuid
			ORDER BY sort_order ASC, name ASC
		`,
		[catalogId, organizationId]
	);
	return result.rows.map(mapCatalogSectionRow);
}

// ---------------------------------------------------------------------------
// Outlet tables
// ---------------------------------------------------------------------------

type OutletTableRow = {
	id: string;
	organization_id: string;
	outlet_id: string;
	code: string;
	label: string;
	is_active: boolean;
	qr_path: string;
};

function mapOutletTableRow(row: OutletTableRow): OutletTable {
	return {
		id: row.id,
		organizationId: row.organization_id,
		outletId: row.outlet_id,
		code: row.code,
		label: row.label,
		isActive: row.is_active,
		qrPath: row.qr_path ?? ''
	};
}

export async function listTablesForOutlet(
	outletId: string,
	organizationId: string
): Promise<OutletTable[]> {
	const result = await query<OutletTableRow>(
		`
			SELECT id::text, organization_id::text, outlet_id::text,
			       code, label, is_active, COALESCE(qr_path, '') AS qr_path
			FROM outlet_tables
			WHERE outlet_id = $1::uuid AND organization_id = $2::uuid
			ORDER BY code ASC
		`,
		[outletId, organizationId]
	);
	return result.rows.map(mapOutletTableRow);
}

export async function upsertOutletTable(params: {
	organizationId: string;
	outletId: string;
	code: string;
	label: string;
	isActive?: boolean;
}): Promise<OutletTable> {
	const result = await query<OutletTableRow>(
		`
			INSERT INTO outlet_tables (organization_id, outlet_id, code, label, is_active)
			VALUES ($1::uuid, $2::uuid, $3, $4, $5)
			ON CONFLICT (outlet_id, code) DO UPDATE
			  SET label = EXCLUDED.label,
			      is_active = EXCLUDED.is_active,
			      updated_at = now()
			RETURNING id::text, organization_id::text, outlet_id::text,
			          code, label, is_active, COALESCE(qr_path, '') AS qr_path
		`,
		[params.organizationId, params.outletId, params.code, params.label, params.isActive ?? true]
	);
	return mapOutletTableRow(result.rows[0]);
}

// ---------------------------------------------------------------------------
// Checkout settings — stored as JSONB in outlets.settings
// ---------------------------------------------------------------------------

export async function updateOutletCheckoutSettings(
	outletId: string,
	organizationId: string,
	settings: {
		checkoutMode?: 'offline' | 'online';
		requireBuyerWhatsapp?: boolean;
		paymentConfirmationEnabled?: boolean;
	}
): Promise<void> {
	// Merge into existing settings JSONB — never overwrite unrelated keys.
	const patch: Record<string, unknown> = {};
	if (settings.checkoutMode !== undefined) patch.checkout_mode = settings.checkoutMode;
	if (settings.requireBuyerWhatsapp !== undefined)
		patch.require_buyer_whatsapp = settings.requireBuyerWhatsapp;
	if (settings.paymentConfirmationEnabled !== undefined)
		patch.payment_confirmation_enabled = settings.paymentConfirmationEnabled;

	await query(
		`UPDATE outlets
		 SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb,
		     updated_at = now()
		 WHERE id = $2::uuid AND organization_id = $3::uuid`,
		[JSON.stringify(patch), outletId, organizationId]
	);
}

// ---------------------------------------------------------------------------
// Outlet settings (legacy compatibility — used by dashboard/settings route)
// ---------------------------------------------------------------------------

export type OutletSettings = {
	id: string;
	outletId: string;
	organizationId: string;
	openingHours: Record<string, unknown>;
	contactInfo: Record<string, unknown>;
	socialLinks: Record<string, unknown>;
};

type OutletSettingsRow = {
	id: string;
	outlet_id: string;
	organization_id: string;
	opening_hours: Record<string, unknown>;
	contact_info: Record<string, unknown>;
	social_links: Record<string, unknown>;
};

export async function getOutletSettings(
	outletId: string,
	organizationId: string
): Promise<OutletSettings | null> {
	const result = await query<OutletSettingsRow>(
		`
			SELECT id::text, outlet_id::text, organization_id::text,
			       COALESCE(opening_hours, '{}'::jsonb) AS opening_hours,
			       COALESCE(contact_info, '{}'::jsonb) AS contact_info,
			       COALESCE(social_links, '{}'::jsonb) AS social_links
			FROM outlet_settings
			WHERE outlet_id = $1::uuid AND organization_id = $2::uuid
			LIMIT 1
		`,
		[outletId, organizationId]
	);

	const row = result.rows[0];
	if (!row) return null;

	return {
		id: row.id,
		outletId: row.outlet_id,
		organizationId: row.organization_id,
		openingHours: row.opening_hours,
		contactInfo: row.contact_info,
		socialLinks: row.social_links
	};
}
