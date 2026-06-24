import { describe, it, expect, vi, beforeEach } from 'vitest';

const getEmbeddableMenuItemsMock = vi.fn();
const getEmbeddableKnowledgeDocsMock = vi.fn();
const upsertEmbeddingsMock = vi.fn();
const embedMock = vi.fn();

vi.mock('$lib/server/repositories/embedding-repository', () => ({
	upsertEmbeddings: (...args: unknown[]) => upsertEmbeddingsMock(...args),
	getEmbeddableMenuItems: (...args: unknown[]) => getEmbeddableMenuItemsMock(...args),
	getEmbeddableKnowledgeDocs: (...args: unknown[]) => getEmbeddableKnowledgeDocsMock(...args)
}));

vi.mock('$lib/server/providers/llm/factory', () => ({
	getLlmProvider: () => ({ embed: embedMock })
}));

vi.mock('$lib/server/config/env', () => ({
	appEnv: { llmEmbeddingModel: 'text-embedding-3-small' }
}));

const { generateEmbeddingsForRestaurant } = await import('./embedding-worker');

beforeEach(() => {
	vi.clearAllMocks();
});

const RESTAURANT_ID = 'rest-1';

describe('generateEmbeddingsForRestaurant', () => {
	it('generates and upserts embeddings for menu items', async () => {
		getEmbeddableMenuItemsMock.mockResolvedValue([
			{ id: 'item-1', content: 'Nasi Goreng | IDR 50000' },
			{ id: 'item-2', content: 'Mie Goreng | IDR 45000' }
		]);
		getEmbeddableKnowledgeDocsMock.mockResolvedValue([]);
		embedMock.mockResolvedValue([
			[0.1, 0.2, 0.3],
			[0.4, 0.5, 0.6]
		]);
		upsertEmbeddingsMock.mockResolvedValue(undefined);

		const result = await generateEmbeddingsForRestaurant(RESTAURANT_ID);

		expect(result).toEqual({ generated: 2, skipped: 0 });
		expect(embedMock).toHaveBeenCalledWith(
			['Nasi Goreng | IDR 50000', 'Mie Goreng | IDR 45000'],
			'text-embedding-3-small'
		);
		expect(upsertEmbeddingsMock).toHaveBeenCalledWith(
			RESTAURANT_ID,
			expect.arrayContaining([
				expect.objectContaining({ sourceId: 'item-1', sourceType: 'menu_item' }),
				expect.objectContaining({ sourceId: 'item-2', sourceType: 'menu_item' })
			]),
			'text-embedding-3-small'
		);
	});

	it('generates embeddings for knowledge documents', async () => {
		getEmbeddableMenuItemsMock.mockResolvedValue([]);
		getEmbeddableKnowledgeDocsMock.mockResolvedValue([{ id: 'doc-1', content: 'Halal certified' }]);
		embedMock.mockResolvedValue([[0.7, 0.8, 0.9]]);
		upsertEmbeddingsMock.mockResolvedValue(undefined);

		const result = await generateEmbeddingsForRestaurant(RESTAURANT_ID);

		expect(result).toEqual({ generated: 1, skipped: 0 });
		expect(upsertEmbeddingsMock).toHaveBeenCalledWith(
			RESTAURANT_ID,
			[expect.objectContaining({ sourceId: 'doc-1', sourceType: 'knowledge_document' })],
			'text-embedding-3-small'
		);
	});

	it('skips batch when embedding count mismatches', async () => {
		getEmbeddableMenuItemsMock.mockResolvedValue([
			{ id: 'item-1', content: 'A' },
			{ id: 'item-2', content: 'B' }
		]);
		getEmbeddableKnowledgeDocsMock.mockResolvedValue([]);
		embedMock.mockResolvedValue([[0.1, 0.2]]);

		const result = await generateEmbeddingsForRestaurant(RESTAURANT_ID);

		expect(result).toEqual({ generated: 0, skipped: 2 });
		expect(upsertEmbeddingsMock).not.toHaveBeenCalled();
	});

	it('skips batch when embed throws', async () => {
		getEmbeddableMenuItemsMock.mockResolvedValue([{ id: 'item-1', content: 'A' }]);
		getEmbeddableKnowledgeDocsMock.mockResolvedValue([]);
		embedMock.mockRejectedValue(new Error('API rate limit'));

		const result = await generateEmbeddingsForRestaurant(RESTAURANT_ID);

		expect(result).toEqual({ generated: 0, skipped: 1 });
	});

	it('handles empty restaurant with no items or docs', async () => {
		getEmbeddableMenuItemsMock.mockResolvedValue([]);
		getEmbeddableKnowledgeDocsMock.mockResolvedValue([]);

		const result = await generateEmbeddingsForRestaurant(RESTAURANT_ID);

		expect(result).toEqual({ generated: 0, skipped: 0 });
		expect(embedMock).not.toHaveBeenCalled();
	});

	it('returns zero results when provider does not support embed', async () => {
		vi.doMock('$lib/server/providers/llm/factory', () => ({
			getLlmProvider: () => ({}) as unknown
		}));

		// Re-import with the no-embed mock
		const noEmbedModule =
			await vi.importActual<typeof import('./embedding-worker')>('./embedding-worker');
		const result = await noEmbedModule.generateEmbeddingsForRestaurant(RESTAURANT_ID);

		expect(result).toEqual({ generated: 0, skipped: 0 });
	});

	it('skips batch when embed returns null', async () => {
		getEmbeddableMenuItemsMock.mockResolvedValue([{ id: 'item-1', content: 'A' }]);
		getEmbeddableKnowledgeDocsMock.mockResolvedValue([]);
		embedMock.mockResolvedValue(null);

		const result = await generateEmbeddingsForRestaurant(RESTAURANT_ID);

		expect(result).toEqual({ generated: 0, skipped: 1 });
		expect(upsertEmbeddingsMock).not.toHaveBeenCalled();
	});

	it('processes combined menu items and knowledge docs', async () => {
		getEmbeddableMenuItemsMock.mockResolvedValue([{ id: 'item-1', content: 'A' }]);
		getEmbeddableKnowledgeDocsMock.mockResolvedValue([{ id: 'doc-1', content: 'B' }]);
		embedMock.mockResolvedValue([[0.1, 0.2]]);
		upsertEmbeddingsMock.mockResolvedValue(undefined);

		const result = await generateEmbeddingsForRestaurant(RESTAURANT_ID);

		expect(result).toEqual({ generated: 2, skipped: 0 });
		expect(embedMock).toHaveBeenCalledTimes(2);
		expect(upsertEmbeddingsMock).toHaveBeenCalledTimes(2);
	});
});
