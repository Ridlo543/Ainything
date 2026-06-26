import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { MenuItem } from '$lib/domain/menu/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const retrieveMenuItemsByFiltersMock = vi.fn();
const searchSimilarItemsMock = vi.fn();
const embedMock = vi.fn();
const getLlmProviderMock = vi.fn();

vi.mock('$lib/server/repositories/retrieval-repository', () => ({
	retrieveMenuItemsByFilters: (...args: unknown[]) => retrieveMenuItemsByFiltersMock(...args)
}));

vi.mock('$lib/server/repositories/embedding-repository', () => ({
	searchSimilarItems: (...args: unknown[]) => searchSimilarItemsMock(...args)
}));

vi.mock('$lib/server/providers/llm/factory', () => ({
	getLlmProvider: () => getLlmProviderMock()
}));

vi.mock('$lib/server/config/env', () => ({
	appEnv: {
		embeddingEnabled: false,
		llmEmbeddingModel: 'text-embedding-3-small'
	}
}));

const { retrieveMenuContext } = await import('./retrieval-service');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const RESTAURANT_ID = 'rest-1';

const makeMenuItem = (overrides: Partial<MenuItem> = {}): MenuItem => ({
	id: overrides.id ?? 'item-1',
	category: overrides.category ?? 'Main',
	name: overrides.name ?? 'Nasi Goreng',
	description: overrides.description ?? 'Fried rice',
	price: overrides.price ?? 85000,
	currency: 'IDR',
	image: '',
	spiceLevel: overrides.spiceLevel ?? 2,
	isAvailable: overrides.isAvailable ?? true,
	isSignature: false,
	dietaryFlags: overrides.dietaryFlags ?? ['halal'],
	allergens: overrides.allergens ?? ['egg'],
	goodFor: [],
	confidence: overrides.confidence ?? 'verified'
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function resetMocks() {
	retrieveMenuItemsByFiltersMock.mockReset();
	searchSimilarItemsMock.mockReset();
	embedMock.mockReset();
	getLlmProviderMock.mockReset();

	// Default: provider with embed support
	getLlmProviderMock.mockReturnValue({ chat: vi.fn(), embed: embedMock });

	// Default: return empty results
	retrieveMenuItemsByFiltersMock.mockResolvedValue([]);
	searchSimilarItemsMock.mockResolvedValue([]);
	embedMock.mockResolvedValue(null);
}

// We need to re-import the module to pick up the mock changes for appEnv
// Since vitest mocks are hoisted, the appEnv values are captured at import time.
// We'll use vi.mocked to modify the mocked module dynamically.

const { appEnv: mockedAppEnv } = await import('$lib/server/config/env');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('retrieveMenuContext — structured-only path', () => {
	beforeEach(resetMocks);

	it('returns structured results when embeddingEnabled is false', async () => {
		vi.mocked(mockedAppEnv).embeddingEnabled = false;
		const items = [makeMenuItem({ id: 'item-1' }), makeMenuItem({ id: 'item-2' })];
		retrieveMenuItemsByFiltersMock.mockResolvedValue(items);

		const result = await retrieveMenuContext({
			outletId: RESTAURANT_ID,
			query: 'spicy noodles',
			embeddingEnabled: false
		});

		expect(result.source).toBe('structured');
		expect(result.items).toHaveLength(2);
		expect(embedMock).not.toHaveBeenCalled();
	});

	it('returns structured results when query is empty', async () => {
		vi.mocked(mockedAppEnv).embeddingEnabled = true;
		const items = [makeMenuItem()];
		retrieveMenuItemsByFiltersMock.mockResolvedValue(items);

		const result = await retrieveMenuContext({
			outletId: RESTAURANT_ID,
			query: '   ',
			embeddingEnabled: true
		});

		expect(result.source).toBe('structured');
		expect(embedMock).not.toHaveBeenCalled();
	});

	it('applies dietary and availability filters', async () => {
		retrieveMenuItemsByFiltersMock.mockResolvedValue([]);

		await retrieveMenuContext({
			outletId: RESTAURANT_ID,
			query: 'vegan',
			preferences: {
				dietaryFlags: ['vegan'],
				allergenExcludes: ['nuts']
			},
			embeddingEnabled: false
		});

		expect(retrieveMenuItemsByFiltersMock).toHaveBeenCalledWith(RESTAURANT_ID, {
			dietaryFlags: ['vegan'],
			allergenExcludes: ['nuts'],
			availableOnly: true,
			searchQuery: 'vegan'
		});
	});

	it('caps results at 20 items', async () => {
		const manyItems = Array.from({ length: 30 }, (_, i) => makeMenuItem({ id: `item-${i}` }));
		retrieveMenuItemsByFiltersMock.mockResolvedValue(manyItems);

		const result = await retrieveMenuContext({
			outletId: RESTAURANT_ID,
			query: 'food',
			embeddingEnabled: false
		});

		expect(result.items).toHaveLength(20);
	});
});

describe('retrieveMenuContext — hybrid path', () => {
	beforeEach(resetMocks);

	it('uses hybrid retrieval when embeddingEnabled and provider supports embed', async () => {
		const structuredItem = makeMenuItem({ id: 'item-1', name: 'Nasi Goreng' });
		retrieveMenuItemsByFiltersMock.mockResolvedValue([structuredItem]);

		// Mock embed provider returning a query embedding
		embedMock.mockResolvedValue([[0.1, 0.2, 0.3]]);

		// Mock similar items from pgvector
		searchSimilarItemsMock.mockResolvedValue([
			{ sourceId: 'item-1', sourceType: 'menu_item', similarity: 0.9 },
			{ sourceId: 'item-2', sourceType: 'menu_item', similarity: 0.85 }
		]);

		// For the semantic-only items, retrieval returns them too
		const semanticItem = makeMenuItem({ id: 'item-2', name: 'Mie Goreng' });
		retrieveMenuItemsByFiltersMock.mockImplementation(
			(_outletId: string, filters: { availableOnly?: boolean }) => {
				// First call is structured, second is for semantic-only items
				if (filters?.availableOnly && !('searchQuery' in filters)) {
					return Promise.resolve([structuredItem, semanticItem]);
				}
				return Promise.resolve([structuredItem]);
			}
		);

		const result = await retrieveMenuContext({
			outletId: RESTAURANT_ID,
			query: 'fried noodles',
			embeddingEnabled: true
		});

		expect(result.source).toBe('hybrid');
		expect(embedMock).toHaveBeenCalledWith(['fried noodles'], 'text-embedding-3-small');
		expect(searchSimilarItemsMock).toHaveBeenCalled();
	});

	it('falls back to structured when provider does not support embed', async () => {
		getLlmProviderMock.mockReturnValue({ chat: vi.fn() });
		const structuredItem = makeMenuItem({ id: 'item-1' });
		retrieveMenuItemsByFiltersMock.mockResolvedValue([structuredItem]);

		const result = await retrieveMenuContext({
			outletId: RESTAURANT_ID,
			query: 'something',
			embeddingEnabled: true
		});

		expect(result.source).toBe('structured');
	});

	it('falls back to structured when embed returns null', async () => {
		embedMock.mockResolvedValue(null);
		const structuredItem = makeMenuItem({ id: 'item-1' });
		retrieveMenuItemsByFiltersMock.mockResolvedValue([structuredItem]);

		const result = await retrieveMenuContext({
			outletId: RESTAURANT_ID,
			query: 'something',
			embeddingEnabled: true
		});

		expect(result.source).toBe('structured');
	});

	it('falls back to structured when semantic search returns no relevant items', async () => {
		embedMock.mockResolvedValue([[0.1, 0.2]]);
		searchSimilarItemsMock.mockResolvedValue([
			{ sourceId: 'item-x', sourceType: 'menu_item', similarity: 0.2 }
		]);
		const structuredItem = makeMenuItem({ id: 'item-1' });
		retrieveMenuItemsByFiltersMock.mockResolvedValue([structuredItem]);

		const result = await retrieveMenuContext({
			outletId: RESTAURANT_ID,
			query: 'something',
			embeddingEnabled: true
		});

		expect(result.source).toBe('structured');
	});
});

describe('retrieveMenuContext — error fallback', () => {
	beforeEach(resetMocks);

	it('falls back to structured when embed throws an error', async () => {
		embedMock.mockRejectedValue(new Error('API error'));
		const structuredItem = makeMenuItem({ id: 'item-1' });
		retrieveMenuItemsByFiltersMock.mockResolvedValue([structuredItem]);

		const result = await retrieveMenuContext({
			outletId: RESTAURANT_ID,
			query: 'something',
			embeddingEnabled: true
		});

		expect(result.source).toBe('structured');
		expect(result.items).toHaveLength(1);
	});

	it('falls back to structured when searchSimilarItems throws', async () => {
		embedMock.mockResolvedValue([[0.1, 0.2]]);
		searchSimilarItemsMock.mockRejectedValue(new Error('DB error'));
		const structuredItem = makeMenuItem({ id: 'item-1' });
		retrieveMenuItemsByFiltersMock.mockResolvedValue([structuredItem]);

		const result = await retrieveMenuContext({
			outletId: RESTAURANT_ID,
			query: 'something',
			embeddingEnabled: true
		});

		expect(result.source).toBe('structured');
	});
});
