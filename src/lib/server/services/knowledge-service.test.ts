import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the repository before importing the service under test
// ---------------------------------------------------------------------------

const listKnowledgeDocsMock = vi.fn();
const insertKnowledgeDocMock = vi.fn();
const updateKnowledgeDocMock = vi.fn();
const deleteKnowledgeDocMock = vi.fn();
const findKnowledgeDocByIdMock = vi.fn();

vi.mock('$lib/server/repositories/knowledge-repository', () => ({
	listKnowledgeDocsForRestaurant: (...args: unknown[]) => listKnowledgeDocsMock(...args),
	insertKnowledgeDoc: (...args: unknown[]) => insertKnowledgeDocMock(...args),
	updateKnowledgeDoc: (...args: unknown[]) => updateKnowledgeDocMock(...args),
	deleteKnowledgeDoc: (...args: unknown[]) => deleteKnowledgeDocMock(...args),
	findKnowledgeDocById: (...args: unknown[]) => findKnowledgeDocByIdMock(...args)
}));

const withUserContextMock = vi.fn();
const resolveTenantContextMock = vi.fn();

vi.mock('$lib/server/db/postgres', () => ({
	withUserContext: (...args: unknown[]) => withUserContextMock(...args)
}));

vi.mock('$lib/server/tenant/tenant-context', () => ({
	resolveTenantContext: (...args: unknown[]) => resolveTenantContextMock(...args)
}));

const { listDocs, createDoc, updateDoc, deleteDoc, KnowledgeNotFoundError } =
	await import('./knowledge-service');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER = {
	id: 'user-owner-bali',
	email: 'owner@test.com',
	name: 'Owner',
	defaultOrganizationId: 'org-1'
};

const ORG_ID = 'org-1';
const RESTAURANT_ID = 'rest-1';
const RESTAURANT_SLUG = 'test-restaurant';

const TENANT = {
	user: USER,
	membership: {
		id: 'm-1',
		userId: USER.id,
		organizationId: ORG_ID,
		restaurantIds: [RESTAURANT_ID],
		role: 'owner' as const
	},
	organization: {
		id: ORG_ID,
		name: 'Test Org',
		slug: 'test-org',
		workspaceHost: 'test.lingua.app',
		plan: 'pilot' as const,
		restaurantIds: [RESTAURANT_ID]
	},
	restaurants: [
		{
			id: RESTAURANT_ID,
			organizationId: ORG_ID,
			name: 'Test Restaurant',
			slug: RESTAURANT_SLUG
		}
	],
	activeRestaurant: {
		id: RESTAURANT_ID,
		organizationId: ORG_ID,
		name: 'Test Restaurant',
		slug: RESTAURANT_SLUG
	}
};

const makeDoc = (overrides: Partial<{ id: string; title: string; content: string }> = {}) => ({
	id: 'doc-1',
	organizationId: ORG_ID,
	restaurantId: RESTAURANT_ID,
	title: 'Halal kitchen',
	content: 'All meat is halal-certified.',
	visibility: 'published' as const,
	sourceType: 'manual' as const,
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-01T00:00:00Z',
	...overrides
});

// ---------------------------------------------------------------------------
// listDocs
// ---------------------------------------------------------------------------

describe('listDocs', () => {
	beforeEach(() => {
		listKnowledgeDocsMock.mockReset();
		resolveTenantContextMock.mockReset();
	});

	it('resolves tenant and lists docs for the active restaurant', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		listKnowledgeDocsMock.mockResolvedValue([makeDoc()]);

		const result = await listDocs(USER, { restaurantSlug: RESTAURANT_SLUG });

		expect(resolveTenantContextMock).toHaveBeenCalledWith(USER, RESTAURANT_SLUG);
		expect(listKnowledgeDocsMock).toHaveBeenCalledWith(RESTAURANT_ID);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('doc-1');
	});

	it('returns an empty array when there are no docs', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		listKnowledgeDocsMock.mockResolvedValue([]);

		const result = await listDocs(USER, { restaurantSlug: RESTAURANT_SLUG });

		expect(result).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// createDoc
// ---------------------------------------------------------------------------

describe('createDoc', () => {
	beforeEach(() => {
		insertKnowledgeDocMock.mockReset();
		resolveTenantContextMock.mockReset();
		withUserContextMock.mockReset();
	});

	it('runs inside withUserContext and inserts with tenant-derived scope', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		withUserContextMock.mockImplementation(async (userId, cb) => {
			// Simulate the transaction client shape used by repos.
			const fakeClient = { query: vi.fn() };
			insertKnowledgeDocMock.mockResolvedValue(makeDoc({ title: 'New note' }));
			return cb(fakeClient as never);
		});

		const input = {
			restaurant: RESTAURANT_SLUG,
			title: 'New note',
			content: 'Some helpful context.',
			visibility: 'published' as const
		};

		const result = await createDoc(USER, { restaurantSlug: RESTAURANT_SLUG, input });

		expect(withUserContextMock).toHaveBeenCalledWith(USER.id, expect.any(Function));
		// repo functions receive (client, args) — assert the second arg shape.
		expect(insertKnowledgeDocMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				organizationId: ORG_ID,
				restaurantId: RESTAURANT_ID,
				title: 'New note',
				content: 'Some helpful context.',
				visibility: 'published',
				sourceType: 'manual'
			})
		);
		expect(result.id).toBe('doc-1');
	});
});

// ---------------------------------------------------------------------------
// updateDoc
// ---------------------------------------------------------------------------

describe('updateDoc', () => {
	beforeEach(() => {
		updateKnowledgeDocMock.mockReset();
		resolveTenantContextMock.mockReset();
		withUserContextMock.mockReset();
	});

	it('updates via the repository inside withUserContext', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		withUserContextMock.mockImplementation(async (_userId, cb) => {
			const fakeClient = { query: vi.fn() };
			updateKnowledgeDocMock.mockResolvedValue(makeDoc({ title: 'Updated title' }));
			return cb(fakeClient as never);
		});

		const input = {
			restaurant: RESTAURANT_SLUG,
			docId: 'doc-1',
			title: 'Updated title',
			content: 'Updated content',
			visibility: 'published' as const
		};

		const result = await updateDoc(USER, { restaurantSlug: RESTAURANT_SLUG, input });

		expect(updateKnowledgeDocMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				organizationId: ORG_ID,
				restaurantId: RESTAURANT_ID,
				docId: 'doc-1',
				title: 'Updated title',
				content: 'Updated content',
				visibility: 'published'
			})
		);
		expect(result.title).toBe('Updated title');
	});

	it('throws KnowledgeNotFoundError when the repo returns null', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		withUserContextMock.mockImplementation(async (_userId, cb) => {
			const fakeClient = { query: vi.fn() };
			updateKnowledgeDocMock.mockResolvedValue(null);
			return cb(fakeClient as never);
		});

		const input = {
			restaurant: RESTAURANT_SLUG,
			docId: 'nonexistent',
			title: 'x',
			content: 'y',
			visibility: 'published' as const
		};

		await expect(
			updateDoc(USER, { restaurantSlug: RESTAURANT_SLUG, input })
		).rejects.toBeInstanceOf(KnowledgeNotFoundError);
	});
});

// ---------------------------------------------------------------------------
// deleteDoc
// ---------------------------------------------------------------------------

describe('deleteDoc', () => {
	beforeEach(() => {
		deleteKnowledgeDocMock.mockReset();
		resolveTenantContextMock.mockReset();
		withUserContextMock.mockReset();
	});

	it('deletes via the repository inside withUserContext', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		withUserContextMock.mockImplementation(async (_userId, cb) => {
			const fakeClient = { query: vi.fn() };
			deleteKnowledgeDocMock.mockResolvedValue(true);
			return cb(fakeClient as never);
		});

		const input = { restaurant: RESTAURANT_SLUG, docId: 'doc-1' };

		await deleteDoc(USER, { restaurantSlug: RESTAURANT_SLUG, input });

		expect(deleteKnowledgeDocMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				organizationId: ORG_ID,
				restaurantId: RESTAURANT_ID,
				docId: 'doc-1'
			})
		);
	});

	it('throws KnowledgeNotFoundError when nothing was deleted', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		withUserContextMock.mockImplementation(async (_userId, cb) => {
			const fakeClient = { query: vi.fn() };
			deleteKnowledgeDocMock.mockResolvedValue(false);
			return cb(fakeClient as never);
		});

		const input = { restaurant: RESTAURANT_SLUG, docId: 'missing' };

		await expect(
			deleteDoc(USER, { restaurantSlug: RESTAURANT_SLUG, input })
		).rejects.toBeInstanceOf(KnowledgeNotFoundError);
	});
});
