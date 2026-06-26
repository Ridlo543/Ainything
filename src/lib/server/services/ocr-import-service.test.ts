import { describe, it, expect, vi, beforeEach } from 'vitest';

const scanMock = vi.fn();

vi.mock('$lib/server/providers/ocr/factory', () => ({
	getOcrProvider: () => ({ scan: (...args: unknown[]) => scanMock(...args) })
}));

const resolveTenantContextMock = vi.fn();
const withUserContextMock = vi.fn();
const loadMenusForRestaurantMock = vi.fn();
const ensureCategoryMock = vi.fn();
const insertMenuItemMock = vi.fn();
const createDraftMenuMock = vi.fn();

vi.mock('$lib/server/tenant/tenant-context', () => ({
	resolveTenantContext: (...args: unknown[]) => resolveTenantContextMock(...args)
}));

vi.mock('$lib/server/db/postgres', () => ({
	withUserContext: (...args: unknown[]) => withUserContextMock(...args)
}));

vi.mock('$lib/server/repositories/admin-menu-repository', () => ({
	loadMenusForRestaurant: (...args: unknown[]) => loadMenusForRestaurantMock(...args),
	ensureCategory: (...args: unknown[]) => ensureCategoryMock(...args),
	insertMenuItem: (...args: unknown[]) => insertMenuItemMock(...args),
	createDraftMenu: (...args: unknown[]) => createDraftMenuMock(...args)
}));

const { scanMenuImage, importOcrItems } = await import('./ocr-import-service');

beforeEach(() => {
	vi.clearAllMocks();
	withUserContextMock.mockImplementation(
		async (_userId: string, fn: (...args: unknown[]) => unknown) =>
			fn({ query: vi.fn().mockResolvedValue({ rows: [{ id: 'new-draft-id' }] }) })
	);
});

const USER = {
	id: 'user-1',
	email: 'admin@test.com',
	name: 'Admin',
	platformRole: 'outlet_admin' as const,
	memberships: [
		{ organizationId: 'org-1', outletIds: ['rest-1'], role: 'outlet_admin' as const }
	]
};

const TENANT = {
	user: USER,
	activeRestaurant: { id: 'rest-1', slug: 'bali-kafe', organizationId: 'org-1' }
};

describe('scanMenuImage', () => {
	it('delegates to OCR provider', async () => {
		const mockResult = { items: [], provider: 'mock', model: 'test' };
		scanMock.mockResolvedValue(mockResult);

		const result = await scanMenuImage({
			imageBase64: 'base64data',
			mimeType: 'image/jpeg',
			sourceType: 'photo',
			languageHints: ['en']
		});

		expect(result).toEqual(mockResult);
		expect(scanMock).toHaveBeenCalledWith(expect.objectContaining({ imageBase64: 'base64data' }));
	});
});

describe('importOcrItems', () => {
	it('imports items into existing draft menu', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		loadMenusForRestaurantMock.mockResolvedValue([{ id: 'draft-1', status: 'draft', version: 1 }]);
		ensureCategoryMock.mockResolvedValue('cat-1');
		insertMenuItemMock.mockImplementation(
			async (_client: unknown, opts: Record<string, unknown>) => ({
				id: `item-${opts.name}`,
				name: opts.name
			})
		);

		const ocrResult = {
			rawText: 'Nasi Goreng 50000',
			issues: [],
			latencyMs: 150,
			items: [
				{
					name: 'Nasi Goreng',
					category: 'Mains',
					description: '',
					currency: 'IDR' as const,
					price: 50000,
					spiceLevel: 2,
					isSignature: false,
					dietaryFlags: [],
					allergens: [],
					nameConfidence: 0.95,
					localNameConfidence: 0,
					categoryConfidence: 0.9,
					descriptionConfidence: 0,
					priceConfidence: 0.99,
					spiceLevelConfidence: 0.8
				}
			],
			provider: 'mock',
			model: 'test-model'
		};

		const result = await importOcrItems(USER, {
			restaurantSlug: 'bali-kafe',
			ocrResult
		});

		expect(result).toHaveLength(1);
		expect(ensureCategoryMock).toHaveBeenCalled();
		expect(insertMenuItemMock).toHaveBeenCalled();
	});

	it('creates new draft menu when none exists', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		loadMenusForRestaurantMock.mockResolvedValue([
			{ id: 'pub-1', status: 'published', version: 2 }
		]);
		createDraftMenuMock.mockResolvedValue('new-draft-id');
		ensureCategoryMock.mockResolvedValue('cat-1');
		insertMenuItemMock.mockResolvedValue({ id: 'item-1', name: 'Test' });

		const ocrResult = {
			rawText: 'Test 20000',
			issues: [],
			latencyMs: 100,
			items: [
				{
					name: 'Test',
					category: 'Drinks',
					description: '',
					currency: 'IDR' as const,
					price: 20000,
					spiceLevel: 0,
					isSignature: false,
					dietaryFlags: [],
					allergens: [],
					nameConfidence: 0.9,
					categoryConfidence: 0.9,
					descriptionConfidence: 0,
					priceConfidence: 0.95,
					spiceLevelConfidence: 0
				}
			],
			provider: 'mock',
			model: 'test'
		};

		await importOcrItems(USER, { restaurantSlug: 'bali-kafe', ocrResult });

		expect(ensureCategoryMock).toHaveBeenCalled();
		expect(insertMenuItemMock).toHaveBeenCalled();
	});

	it('returns empty array when OCR has no items', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		loadMenusForRestaurantMock.mockResolvedValue([{ id: 'draft-1', status: 'draft', version: 1 }]);

		const result = await importOcrItems(USER, {
			restaurantSlug: 'bali-kafe',
			ocrResult: {
				rawText: '',
				issues: [],
				latencyMs: 50,
				items: [],
				provider: 'mock',
				model: 'test'
			}
		});

		expect(result).toEqual([]);
	});
});
