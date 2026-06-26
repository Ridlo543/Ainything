import type { MenuItem, DietaryFlag, Allergen } from '$lib/domain/menu/types';
import { retrieveMenuItemsByFilters } from '$lib/server/repositories/retrieval-repository';
import { searchSimilarItems } from '$lib/server/repositories/embedding-repository';
import { getLlmProvider } from '$lib/server/providers/llm/factory';
import { appEnv } from '$lib/server/config/env';

type RetrievalPreferences = {
	dietaryFlags?: DietaryFlag[];
	allergenExcludes?: Allergen[];
};

type RetrievalParams = {
	outletId: string;
	query: string;
	preferences?: RetrievalPreferences;
	embeddingEnabled: boolean;
};

type RetrievalResult = {
	items: MenuItem[];
	source: 'structured' | 'hybrid';
};

/** Maximum number of items to include in the LLM context window. */
const MAX_CONTEXT_ITEMS = 20;

/** Minimum cosine similarity to include a semantic search result. */
const MIN_SIMILARITY = 0.5;

/**
 * Retrieves menu context for the chat service.
 *
 * Strategy:
 * 1. Always run structured retrieval first (dietary, availability, text search).
 * 2. If embeddingEnabled and a query is provided, also run semantic search.
 *    - Semantic results are merged with structured results.
 *    - Items found via semantic search that weren't in the structured results
 *      are appended (they may not match text filters but are semantically relevant).
 * 3. If the embedding path fails (provider doesn't support it, API error),
 *    fall back to structured-only results.
 * 4. Final list is capped at MAX_CONTEXT_ITEMS.
 */
export async function retrieveMenuContext(params: RetrievalParams): Promise<RetrievalResult> {
	const { outletId, query, preferences, embeddingEnabled } = params;

	// Step 1: Always run structured retrieval with preferences and text search.
	const structuredFilters = {
		dietaryFlags: preferences?.dietaryFlags,
		allergenExcludes: preferences?.allergenExcludes,
		availableOnly: true,
		searchQuery: query.trim() || undefined
	};

	const structuredItems = await retrieveMenuItemsByFilters(outletId, structuredFilters);

	// Step 2: If embeddings not enabled or no query, return structured results.
	if (!embeddingEnabled || !query.trim()) {
		return {
			items: structuredItems.slice(0, MAX_CONTEXT_ITEMS),
			source: 'structured'
		};
	}

	// Step 3: Attempt semantic search to augment/re-rank results.
	try {
		const provider = getLlmProvider();

		if (!provider.embed) {
			// Provider doesn't support embeddings — structured only.
			return {
				items: structuredItems.slice(0, MAX_CONTEXT_ITEMS),
				source: 'structured'
			};
		}

		const embeddings = await provider.embed([query], appEnv.llmEmbeddingModel);

		if (!embeddings || embeddings.length === 0) {
			return {
				items: structuredItems.slice(0, MAX_CONTEXT_ITEMS),
				source: 'structured'
			};
		}

		const queryEmbedding = embeddings[0];
		const similarItems = await searchSimilarItems(outletId, queryEmbedding, MAX_CONTEXT_ITEMS);

		// Filter semantic results by minimum similarity.
		const relevantSimilar = similarItems.filter((item) => item.similarity >= MIN_SIMILARITY);

		if (relevantSimilar.length === 0) {
			return {
				items: structuredItems.slice(0, MAX_CONTEXT_ITEMS),
				source: 'structured'
			};
		}

		// Merge: structured items first (they match hard filters), then add
		// semantically-relevant items not already present.
		const structuredIds = new Set(structuredItems.map((item) => item.id));

		// Load full item data for semantic-only results.
		const semanticOnlyIds = relevantSimilar
			.filter((item) => item.sourceType === 'menu_item' && !structuredIds.has(item.sourceId))
			.map((item) => item.sourceId);

		let semanticOnlyItems: MenuItem[] = [];

		if (semanticOnlyIds.length > 0) {
			// Retrieve these items without dietary/availability filters — they're
			// semantically relevant and should be included even if they don't match
			// the strict dietary filter (the model will handle recommendations).
			semanticOnlyItems = await retrieveMenuItemsByFilters(outletId, {
				availableOnly: true
			});

			semanticOnlyItems = semanticOnlyItems.filter((item) => semanticOnlyIds.includes(item.id));

			// Re-order by similarity score (highest first).
			const similarityOrder = new Map(relevantSimilar.map((s) => [s.sourceId, s.similarity]));
			semanticOnlyItems.sort(
				(a, b) => (similarityOrder.get(b.id) ?? 0) - (similarityOrder.get(a.id) ?? 0)
			);
		}

		const merged = [...structuredItems, ...semanticOnlyItems].slice(0, MAX_CONTEXT_ITEMS);

		return {
			items: merged,
			source: 'hybrid'
		};
	} catch (err) {
		// Embedding path failed — log and fall back to structured only.
		console.error('[retrieval-service] Semantic search failed, falling back to structured:', err);
		return {
			items: structuredItems.slice(0, MAX_CONTEXT_ITEMS),
			source: 'structured'
		};
	}
}
