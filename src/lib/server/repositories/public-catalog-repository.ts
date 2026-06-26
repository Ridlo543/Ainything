/**
 * Public catalog repository — buyer-facing QR flow.
 *
 * Replaces public-menu-repository.ts for the new outlets/catalogs/products schema.
 * All queries run via ainything_app role (RLS enforced).
 * Public session context is set via withPublicSessionContext().
 *
 * Backward-compat note: public-menu-repository.ts still handles the legacy
 * restaurants/menus/menu_items path. This file handles the new outlets path.
 * Both can coexist until the CLEANUP sprint drops old tables.
 */

import type { PublicCatalogBootstrap, OutletTable, Outlet } from '$lib/domain/outlet/types';
import {
	query,
	directQuery,
	withTransaction,
	withPublicSessionContext,
	type DatabaseClient
} from '$lib/server/db/postgres';
import {
	mapOutletRow,
	loadPublishedSectionsFull,
	loadPublishedProducts,
	type OutletRow
} from '$lib/server/repositories/outlet-row-mapper';

type BootstrapRow = OutletRow & {
	table_id: string;
	table_organization_id: string;
	table_outlet_id: string;
	table_code: string;
	table_label: string;
};

type CreateBuyerSessionInput = {
	organizationId: string;
	outletId: string;
	tableId: string | null;
	languageTag: string;
	preferences: Record<string, unknown>;
};

type CreateFallbackInput = {
	organizationId: string;
	outletId: string;
	tableId: string;
	sessionId?: string;
	languageTag: string;
	guestNeed: string;
	summary: string;
	priority: 'normal' | 'high';
};

type CreateFeedbackInput = {
	organizationId: string;
	outletId: string;
	sessionId?: string;
	helpful?: boolean;
	issueType?: string;
	comment?: string;
};

// ---------------------------------------------------------------------------
// Bootstrap (QR scan entry point)
// ---------------------------------------------------------------------------

/**
 * Resolve the public outlet + table for a QR code scan.
 * Returns null if slug is inactive or table code doesn't exist.
 */
export async function resolvePublicCatalogBootstrap(
	outletSlug: string,
	tableCode: string
): Promise<PublicCatalogBootstrap | null> {
	const base = await query<BootstrapRow>(
		`
			SELECT
				o.id::text,
				o.organization_id::text,
				o.name,
				o.slug,
				COALESCE(o.public_host, '') AS public_host,
				COALESCE(o.location, '') AS location,
				o.business_type,
				COALESCE(o.language_tags, ARRAY['id']) AS language_tags,
				COALESCE(o.default_language_tag, 'id') AS default_language_tag,
				COALESCE(o.timezone, 'Asia/Jakarta') AS timezone,
				COALESCE(o.hero_image_url, '') AS hero_image_url,
				COALESCE(o.table_count, 0) AS table_count,
				COALESCE(o.description, '') AS description,
				COALESCE(o.knowledge_highlights, ARRAY[]::text[]) AS knowledge_highlights,
				COALESCE(o.analytics, '{}'::jsonb) AS analytics,
				t.id::text AS table_id,
				t.organization_id::text AS table_organization_id,
				t.outlet_id::text AS table_outlet_id,
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
		[outletSlug, tableCode]
	);

	const row = base.rows[0];
	if (!row) return null;

	const outlet = mapOutletRow(row);
	const table: OutletTable = {
		id: row.table_id,
		organizationId: row.table_organization_id,
		outletId: row.table_outlet_id,
		code: row.table_code,
		label: row.table_label,
		isActive: true,
		qrPath: ''
	};

	// Load catalog data (sections + products) in the same round-trip.
	// PublicCatalogBootstrap requires full CatalogSection objects (not just names).
	const [sectionsMap, productsMap] = await Promise.all([
		withTransaction(async (client) => loadPublishedSectionsFull(client, [outlet.id])),
		withTransaction(async (client) => loadPublishedProducts(client, [outlet.id]))
	]);

	const outletWithCatalog = {
		...outlet,
		sections: sectionsMap.get(outlet.id) ?? [],
		products: productsMap.get(outlet.id) ?? []
	};

	return { outlet: outletWithCatalog, table };
}

/**
 * Load the full catalog (sections + products) for a public outlet view.
 * Runs in a transaction to keep section and product queries consistent.
 */
export async function loadPublicCatalog(outletId: string) {
	return withTransaction(async (client) => {
		const [sectionsMap, productsMap] = await Promise.all([
			loadPublishedSectionsFull(client, [outletId]),
			loadPublishedProducts(client, [outletId])
		]);
		return {
			sections: sectionsMap.get(outletId) ?? [],
			products: productsMap.get(outletId) ?? []
		};
	});
}

/**
 * Load a single active outlet by slug — used by cart/order routes that need
 * only the outlet identity (id, organizationId) without table/catalog data.
 */
export async function loadPublicOutletBySlug(outletSlug: string): Promise<Outlet | null> {
	const result = await query<OutletRow>(
		`SELECT
			o.id::text,
			o.organization_id::text,
			o.name,
			o.slug,
			o.status,
			COALESCE(o.public_host, '') AS public_host,
			COALESCE(o.location, '') AS location,
			o.business_type,
			COALESCE(o.language_tags, ARRAY['id']) AS language_tags,
			COALESCE(o.default_language_tag, 'id') AS default_language_tag,
			COALESCE(o.timezone, 'Asia/Jakarta') AS timezone,
			COALESCE(o.hero_image_url, '') AS hero_image_url,
			COALESCE(o.table_count, 0) AS table_count,
			COALESCE(o.description, '') AS description,
			COALESCE(o.knowledge_highlights, ARRAY[]::text[]) AS knowledge_highlights,
			COALESCE(o.analytics, '{}'::jsonb) AS analytics,
			COALESCE(o.settings, '{}'::jsonb) AS settings
		FROM outlets o
		WHERE o.slug = $1
		  AND o.status = 'active'
		LIMIT 1`,
		[outletSlug]
	);

	const row = result.rows[0];
	return row ? mapOutletRow(row) : null;
}

// ---------------------------------------------------------------------------
// Buyer sessions
// ---------------------------------------------------------------------------

export async function createBuyerSession(input: CreateBuyerSessionInput) {
	// Use directQuery (superuser) — buyer session creation is a system operation
	// performed before any user context exists. The ainything_app role is blocked
	// by RLS on buyer_sessions even with a permissive INSERT policy.
	const result = await directQuery<{ id: string; public_session_id: string }>(
		`
			INSERT INTO buyer_sessions (
				organization_id, outlet_id, table_id,
				language_tag, metadata
			)
			VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::jsonb)
			RETURNING id::text, public_session_id::text
		`,
		[
			input.organizationId,
			input.outletId,
			input.tableId,
			input.languageTag,
			JSON.stringify(input.preferences ?? {})
		]
	);
	return result.rows[0];
}

export async function getBuyerSession(publicSessionId: string) {
	return withPublicSessionContext(publicSessionId, async (client) => {
		const result = await client.query<{
			id: string;
			public_session_id: string;
			organization_id: string;
			outlet_id: string;
			table_id: string | null;
			language_tag: string;
			created_at: string;
		}>(
			`
				SELECT id::text, public_session_id::text, organization_id::text,
				       outlet_id::text, table_id::text, language_tag, created_at::text
				FROM buyer_sessions
				WHERE public_session_id = $1::uuid
				LIMIT 1
			`,
			[publicSessionId]
		);
		return result.rows[0] ?? null;
	});
}

// ---------------------------------------------------------------------------
// Fallback requests (buyer asked something AI couldn't handle)
// ---------------------------------------------------------------------------

export async function createFallbackRequest(input: CreateFallbackInput) {
	const runInsert = async (client: DatabaseClient) => {
		const result = await client.query<{ id: string }>(
			`
				INSERT INTO fallback_requests (
					organization_id, outlet_id, table_id,
					buyer_session_id, language_tag,
					guest_need, summary, priority
				)
				VALUES (
					$1::uuid, $2::uuid, $3::uuid,
					$4::uuid, $5,
					$6, $7, $8
				)
				RETURNING id::text
			`,
			[
				input.organizationId,
				input.outletId,
				input.tableId,
				input.sessionId ?? null,
				input.languageTag,
				input.guestNeed,
				input.summary,
				input.priority
			]
		);
		return result.rows[0];
	};

	if (input.sessionId) {
		return withPublicSessionContext(input.sessionId, runInsert);
	}
	return withTransaction(runInsert);
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export async function createBuyerFeedback(input: CreateFeedbackInput) {
	const runInsert = async (client: DatabaseClient) => {
		const result = await client.query<{ id: string }>(
			`
				INSERT INTO feedback (
					organization_id, restaurant_id,
					session_id, helpful, issue_type, comment
				)
				VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
				RETURNING id::text
			`,
			[
				input.organizationId,
				input.outletId,
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
