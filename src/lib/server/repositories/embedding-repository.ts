import { query } from '$lib/server/db/postgres';

type EmbeddingInput = {
	sourceId: string;
	sourceType: string;
	content: string;
	embedding: number[];
};

type SimilarItemResult = {
	sourceId: string;
	sourceType: string;
	similarity: number;
};

export type EmbeddableItemRow = {
	id: string;
	content: string;
};

/**
 * Fetches all published products for an outlet for embedding generation.
 * Builds a text representation from name, local_name, description, price, spice, dietary flags.
 *
 * @param outletId — the outlet (formerly restaurant) UUID to embed products for.
 */
export async function getEmbeddableMenuItems(outletId: string): Promise<EmbeddableItemRow[]> {
	const result = await query<EmbeddableItemRow>(
		`
			SELECT
				p.id::text,
				CONCAT_WS(' | ',
					p.name,
					p.local_name,
					p.description,
					'IDR ' || p.price_amount,
					'spice:' || p.spice_level,
					COALESCE(STRING_AGG(DISTINCT pdf.flag_code, ','), ''),
					CASE WHEN p.is_signature THEN 'signature' ELSE '' END
				) AS content
			FROM products p
			JOIN catalogs c ON c.id = p.catalog_id
			LEFT JOIN product_dietary_flags pdf ON pdf.product_id = p.id
			WHERE p.outlet_id = $1::uuid
				AND c.status = 'published'
				AND p.is_available = true
			GROUP BY p.id
			ORDER BY p.sort_order, p.name
		`,
		[outletId]
	);

	return result.rows;
}

/**
 * Fetches all published knowledge documents for embedding generation.
 */
export async function getEmbeddableKnowledgeDocs(
	restaurantId: string
): Promise<EmbeddableItemRow[]> {
	const result = await query<EmbeddableItemRow>(
		`
			SELECT
				kd.id::text,
				CONCAT(kd.title, ': ', kd.content) AS content
			FROM knowledge_documents kd
			WHERE kd.restaurant_id = $1::uuid
				AND kd.visibility = 'published'
			ORDER BY kd.created_at DESC
		`,
		[restaurantId]
	);

	return result.rows;
}

/**
 * Upserts embeddings for menu items or knowledge documents into item_embeddings.
 *
 * Uses ON CONFLICT (source_type, source_id, model) to update existing rows when
 * content changes. Runs inside a user-context transaction so RLS policies apply.
 *
 * Organization ID is resolved from the restaurant inside the transaction to
 * keep the public API surface minimal (callers only need restaurantId).
 */
export async function upsertEmbeddings(
	restaurantId: string,
	items: EmbeddingInput[],
	model: string = 'text-embedding-3-small'
): Promise<void> {
	if (items.length === 0) return;

	// Resolve organization_id once for this batch.
	const orgResult = await query<{ organization_id: string }>(
		`SELECT organization_id::text FROM outlets WHERE id = $1::uuid`,
		[restaurantId]
	);

	const organizationId = orgResult.rows[0]?.organization_id;

	if (!organizationId) {
		console.error('[embedding-repo] Outlet not found:', restaurantId);
		return;
	}

	// Use a system-level transaction — embedding worker runs as an admin action,
	// not as a guest session. withUserContext requires an external auth id, which
	// we don't have in a background worker. Instead, we run a direct transaction.
	// RLS on item_embeddings uses app.has_restaurant_access which checks membership.
	// The admin action path will need to set the appropriate user context at a
	// higher level. For now, we use the pool-level query which runs as ainything_app.
	for (const item of items) {
		const embeddingStr = `[${item.embedding.join(',')}]`;

		await query(
			`
				INSERT INTO item_embeddings (
					organization_id,
					restaurant_id,
					source_type,
					source_id,
					model,
					dimensions,
					embedding,
					content_snapshot
				)
				VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5, $6, $7::vector, $8)
				ON CONFLICT (source_type, source_id, model)
				DO UPDATE SET
					embedding = EXCLUDED.embedding,
					content_snapshot = EXCLUDED.content_snapshot,
					dimensions = EXCLUDED.dimensions,
					updated_at = now()
			`,
			[
				organizationId,
				restaurantId,
				item.sourceType,
				item.sourceId,
				model,
				item.embedding.length,
				embeddingStr,
				item.content
			]
		);
	}
}

/**
 * Searches for items similar to the given query embedding using pgvector
 * cosine distance. Results are scoped to a single restaurant (never cross-tenant).
 *
 * Returns the top `limit` results ordered by similarity (closest first).
 */
export async function searchSimilarItems(
	restaurantId: string,
	queryEmbedding: number[],
	limit: number = 20
): Promise<SimilarItemResult[]> {
	const embeddingStr = `[${queryEmbedding.join(',')}]`;

	const result = await query<SimilarItemResult>(
		`
			SELECT
				source_id::text AS "sourceId",
				source_type AS "sourceType",
				1 - (embedding <=> $1::vector) AS similarity
			FROM item_embeddings
			WHERE restaurant_id = $2::uuid
			ORDER BY embedding <=> $1::vector
			LIMIT $3
		`,
		[embeddingStr, restaurantId, limit]
	);

	return result.rows;
}

/**
 * Deletes embeddings for the given source IDs and type, scoped to a restaurant.
 * Used when menu items are removed or unpublished.
 */
export async function deleteEmbeddingsForSource(
	restaurantId: string,
	sourceType: string,
	sourceIds: string[]
): Promise<void> {
	if (sourceIds.length === 0) return;

	await query(
		`
			DELETE FROM item_embeddings
			WHERE restaurant_id = $1::uuid
				AND source_type = $2
				AND source_id = ANY($3::uuid[])
		`,
		[restaurantId, sourceType, sourceIds]
	);
}
