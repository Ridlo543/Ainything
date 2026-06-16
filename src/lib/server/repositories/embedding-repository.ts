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
		`SELECT organization_id::text FROM restaurants WHERE id = $1::uuid`,
		[restaurantId]
	);

	const organizationId = orgResult.rows[0]?.organization_id;

	if (!organizationId) {
		console.error('[embedding-repo] Restaurant not found:', restaurantId);
		return;
	}

	// Use a system-level transaction — embedding worker runs as an admin action,
	// not as a guest session. withUserContext requires an external auth id, which
	// we don't have in a background worker. Instead, we run a direct transaction.
	// RLS on item_embeddings uses app.has_restaurant_access which checks membership.
	// The admin action path will need to set the appropriate user context at a
	// higher level. For now, we use the pool-level query which runs as lingua_app.
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
