/**
 * Repository for admin/manager knowledge-document CRUD.
 *
 * All methods accept a `DatabaseClient` so callers control the transaction
 * boundary (typically `withUserContext`). Every query is scoped by
 * organization_id + restaurant_id so the 0009 RLS write policies evaluate
 * correctly for the authenticated membership.
 *
 * Reads run via the bare `query` helper (with the RLS SELECT policy in 0001
 * already restricting to `app.has_restaurant_access(restaurant_id)`).
 * Writes run inside `withUserContext` so the app.user_external_id is set
 * before the 0009 INSERT/UPDATE/DELETE policies evaluate.
 */

import { query, type DatabaseClient } from '$lib/server/db/postgres';
import type { KnowledgeDoc } from '$lib/domain/knowledge/types';
import type { KnowledgeSourceType, KnowledgeVisibilityCode } from '$lib/domain/knowledge/schema';

// ---------------------------------------------------------------------------
// Row type matching the DB column shape (snake_case, postgres native types)
// ---------------------------------------------------------------------------

type KnowledgeDocRow = {
	id: string;
	organization_id: string;
	restaurant_id: string;
	title: string;
	content: string;
	visibility: string;
	source_type: string;
	created_at: Date;
	updated_at: Date;
};

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapRowToDoc(row: KnowledgeDocRow): KnowledgeDoc {
	return {
		id: row.id,
		organizationId: row.organization_id,
		outletId: row.restaurant_id,
		title: row.title,
		content: row.content,
		visibility: row.visibility as KnowledgeVisibilityCode,
		sourceType: (row.source_type as KnowledgeSourceType) ?? 'manual',
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString()
	};
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Lists all knowledge documents for a restaurant, newest first.
 * Uses the bare pool connection — RLS policy from migration 0001
 * (`knowledge_documents_tenant_select`) restricts to restaurants the
 * `ainything_app` role can see via `app.has_restaurant_access`.
 */
export async function listKnowledgeDocsForRestaurant(
	restaurantId: string
): Promise<KnowledgeDoc[]> {
	const result = await query<KnowledgeDocRow>(
		`
			SELECT
				id::text,
				organization_id::text,
				restaurant_id::text,
				title,
				content,
				visibility,
				source_type,
				created_at,
				updated_at
			FROM knowledge_documents
			WHERE restaurant_id = $1::uuid
			ORDER BY created_at DESC
		`,
		[restaurantId]
	);

	return result.rows.map(mapRowToDoc);
}

/**
 * Looks up a single knowledge document by id. Returns null when not found
 * or when the RLS policy denies access. The lookup is restaurant-scoped
 * because the RLS policy already enforces tenant isolation — passing a
 * docId from a different tenant returns null instead of an error so the
 * UI can treat it as "not found" without leaking existence.
 */
export async function findKnowledgeDocById(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		docId
	}: { organizationId: string; restaurantId: string; docId: string }
): Promise<KnowledgeDoc | null> {
	const result = await client.query<KnowledgeDocRow>(
		`
			SELECT
				id::text,
				organization_id::text,
				restaurant_id::text,
				title,
				content,
				visibility,
				source_type,
				created_at,
				updated_at
			FROM knowledge_documents
			WHERE id = $1::uuid
				AND organization_id = $2::uuid
				AND restaurant_id = $3::uuid
		`,
		[docId, organizationId, restaurantId]
	);

	const row = result.rows[0];
	return row ? mapRowToDoc(row) : null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Inserts a new knowledge document. Returns the created row.
 * Must run inside `withUserContext` so the 0009 INSERT policy allows it.
 */
export async function insertKnowledgeDoc(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		title,
		content,
		visibility,
		sourceType
	}: {
		organizationId: string;
		restaurantId: string;
		title: string;
		content: string;
		visibility: KnowledgeVisibilityCode;
		sourceType?: KnowledgeSourceType;
	}
): Promise<KnowledgeDoc> {
	const result = await client.query<KnowledgeDocRow>(
		`
			INSERT INTO knowledge_documents (
				organization_id,
				restaurant_id,
				title,
				content,
				visibility,
				source_type
			)
			VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
			RETURNING
				id::text,
				organization_id::text,
				restaurant_id::text,
				title,
				content,
				visibility,
				source_type,
				created_at,
				updated_at
		`,
		[organizationId, restaurantId, title, content, visibility, sourceType ?? 'manual']
	);

	const row = result.rows[0];
	if (!row) {
		throw new Error('Insert knowledge_documents returned no row.');
	}
	return mapRowToDoc(row);
}

/**
 * Updates an existing knowledge document. Returns null when the row does not
 * exist or the RLS policy denies access.
 */
export async function updateKnowledgeDoc(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		docId,
		title,
		content,
		visibility
	}: {
		organizationId: string;
		restaurantId: string;
		docId: string;
		title: string;
		content: string;
		visibility: KnowledgeVisibilityCode;
	}
): Promise<KnowledgeDoc | null> {
	const result = await client.query<KnowledgeDocRow>(
		`
			UPDATE knowledge_documents
			SET title = $4,
				content = $5,
				visibility = $6
			WHERE id = $1::uuid
				AND organization_id = $2::uuid
				AND restaurant_id = $3::uuid
			RETURNING
				id::text,
				organization_id::text,
				restaurant_id::text,
				title,
				content,
				visibility,
				source_type,
				created_at,
				updated_at
		`,
		[docId, organizationId, restaurantId, title, content, visibility]
	);

	const row = result.rows[0];
	return row ? mapRowToDoc(row) : null;
}

/**
 * Deletes a knowledge document. Returns true when a row was deleted, false when
 * it did not exist (or the RLS policy denied access). Treat both as "not found"
 * so the caller never learns whether the row exists in another tenant.
 */
export async function deleteKnowledgeDoc(
	client: DatabaseClient,
	{
		organizationId,
		restaurantId,
		docId
	}: { organizationId: string; restaurantId: string; docId: string }
): Promise<boolean> {
	const result = await client.query(
		`
			DELETE FROM knowledge_documents
			WHERE id = $1::uuid
				AND organization_id = $2::uuid
				AND restaurant_id = $3::uuid
		`,
		[docId, organizationId, restaurantId]
	);

	return (result.rowCount ?? 0) > 0;
}
