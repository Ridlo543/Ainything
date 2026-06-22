import {
	upsertEmbeddings,
	getEmbeddableMenuItems,
	getEmbeddableKnowledgeDocs
} from '$lib/server/repositories/embedding-repository';
import { getLlmProvider } from '$lib/server/providers/llm/factory';
import { appEnv } from '$lib/server/config/env';

type EmbedWorkerResult = {
	generated: number;
	skipped: number;
};

/** Batch size for embedding API calls. */
const BATCH_SIZE = 20;

/**
 * Generates embeddings for all published menu items and knowledge documents
 * belonging to a restaurant. Called after menu publish or via admin action —
 * never in the tourist hot path.
 *
 * For each item, a text representation is built and sent to the LLM provider's
 * embed() method. Results are upserted into the item_embeddings table.
 *
 * Errors are handled gracefully: failed items are skipped and counted, but the
 * worker continues processing remaining items.
 */
export async function generateEmbeddingsForRestaurant(
	restaurantId: string
): Promise<EmbedWorkerResult> {
	const provider = getLlmProvider();
	const model = appEnv.llmEmbeddingModel;

	if (!provider.embed) {
		console.warn('[embedding-worker] Current LLM provider does not support embeddings. Skipping.');
		return { generated: 0, skipped: 0 };
	}

	let generated = 0;
	let skipped = 0;

	const [menuItemRows, knowledgeRows] = await Promise.all([
		getEmbeddableMenuItems(restaurantId),
		getEmbeddableKnowledgeDocs(restaurantId)
	]);

	// Process menu items in batches.
	for (let i = 0; i < menuItemRows.length; i += BATCH_SIZE) {
		const batch = menuItemRows.slice(i, i + BATCH_SIZE);
		const texts = batch.map((row) => row.content);

		try {
			const embeddings = await provider.embed(texts, model);

			if (!embeddings || embeddings.length !== batch.length) {
				console.warn(
					`[embedding-worker] Embedding count mismatch for batch starting at index ${i}. Skipping batch.`
				);
				skipped += batch.length;
				continue;
			}

			await upsertEmbeddings(
				restaurantId,
				batch.map((row, idx) => ({
					sourceId: row.id,
					sourceType: 'menu_item',
					content: row.content,
					embedding: embeddings[idx]
				})),
				model
			);

			generated += batch.length;
		} catch (err) {
			console.error(
				`[embedding-worker] Failed to embed menu item batch starting at index ${i}:`,
				err
			);
			skipped += batch.length;
		}
	}

	// Process knowledge documents in batches.
	for (let i = 0; i < knowledgeRows.length; i += BATCH_SIZE) {
		const batch = knowledgeRows.slice(i, i + BATCH_SIZE);
		const texts = batch.map((row) => row.content);

		try {
			const embeddings = await provider.embed(texts, model);

			if (!embeddings || embeddings.length !== batch.length) {
				console.warn(
					`[embedding-worker] Embedding count mismatch for knowledge batch starting at index ${i}. Skipping batch.`
				);
				skipped += batch.length;
				continue;
			}

			await upsertEmbeddings(
				restaurantId,
				batch.map((row, idx) => ({
					sourceId: row.id,
					sourceType: 'knowledge_document',
					content: row.content,
					embedding: embeddings[idx]
				})),
				model
			);

			generated += batch.length;
		} catch (err) {
			console.error(
				`[embedding-worker] Failed to embed knowledge batch starting at index ${i}:`,
				err
			);
			skipped += batch.length;
		}
	}

	console.info(
		`[embedding-worker] Restaurant ${restaurantId}: generated=${generated}, skipped=${skipped}`
	);

	return { generated, skipped };
}
