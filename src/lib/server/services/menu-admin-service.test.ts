import type { MenuItem } from '$lib/domain/menu/types';
import type { Product } from '$lib/domain/outlet/types';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const withUserContextMock = vi.fn();
const resolveTenantContextMock = vi.fn();
const getProductByIdMock = vi.fn();
const loadCatalogsForOutletMock = vi.fn();
const loadProductsForCatalogMock = vi.fn();
const updateProductMock = vi.fn();
const setProductAvailabilityMock = vi.fn();
const updateProductFlagsMock = vi.fn();
const publishCatalogMock = vi.fn();
const productToMenuItemMock = vi.fn();

vi.mock('$lib/server/db/postgres', () => ({
	withUserContext: (...args: unknown[]) => withUserContextMock(...args)
}));

vi.mock('$lib/server/tenant/tenant-context', () => ({
	resolveTenantContext: (...args: unknown[]) => resolveTenantContextMock(...args)
}));

vi.mock('$lib/server/repositories/admin-menu-repository', () => ({
	getProductById: (...args: unknown[]) => getProductByIdMock(...args),
	loadCatalogsForOutlet: (...args: unknown[]) => loadCatalogsForOutletMock(...args),
	loadProductsForCatalog: (...args: unknown[]) => loadProductsForCatalogMock(...args),
	updateProduct: (...args: unknown[]) => updateProductMock(...args),
	setProductAvailability: (...args: unknown[]) => setProductAvailabilityMock(...args),
	updateProductFlags: (...args: unknown[]) => updateProductFlagsMock(...args),
	publishCatalog: (...args: unknown[]) => publishCatalogMock(...args),
	productToMenuItem: (...args: unknown[]) => productToMenuItemMock(...args),
	// legacy shims still exported — include them so vi.mock doesn't blow up if anything imports them
	findMenuItemById: vi.fn(),
	loadMenusForRestaurant: vi.fn(),
	loadMenuItemsForMenu: vi.fn(),
	countMenuItems: vi.fn(),
	updateMenuItem: vi.fn(),
	setMenuItemAvailability: vi.fn(),
	updateMenuItemFlags: vi.fn(),
	publishMenu: vi.fn(),
	ensureCategory: vi.fn(),
	createDraftMenu: vi.fn(),
	createProduct: vi.fn()
}));

vi.mock('$lib/server/config/env', () => ({
	appEnv: { embeddingEnabled: false }
}));

const {
	editMenuItem,
	toggleAvailability,
	publishDraftMenu,
	validateMenuForPublish,
	MenuPublishValidationError
} = await import('./menu-admin-service');

beforeEach(() => {
	vi.clearAllMocks();
	withUserContextMock.mockImplementation(
		async (_userId: string, fn: (...args: unknown[]) => unknown) => fn({})
	);
	// Default: productToMenuItem returns a minimal MenuItem shape
	productToMenuItemMock.mockImplementation((p: Product) => ({
		...p,
		category: p.section ?? '',
		image: p.imageUrl ?? '',
		spiceLevel: 0
	}));
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

const MOCK_PRODUCT: Product = {
	id: 'item-1',
	section: 'Main',
	name: 'Nasi Goreng',
	description: '',
	price: 50000,
	currency: 'IDR',
	imageUrl: '',
	isAvailable: true,
	isSignature: false,
	sortOrder: 0,
	dietaryFlags: [],
	allergens: [],
	goodFor: [],
	confidence: 'verified'
};

describe('editMenuItem', () => {
	it('updates item and returns full result', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		updateProductMock.mockResolvedValue(MOCK_PRODUCT);
		updateProductFlagsMock.mockResolvedValue(undefined);
		getProductByIdMock.mockResolvedValue(MOCK_PRODUCT);

		const result = await editMenuItem(USER, {
			restaurantSlug: 'bali-kafe',
			itemId: 'item-1',
			input: {
				name: 'Nasi Goreng',
				price: 50000,
				isAvailable: true,
				dietaryFlags: [],
				allergens: [],
				description: '',
				spiceLevel: 0,
				confidence: 'verified',
				itemId: 'item-1',
				outlet: 'bali-kafe'
			}
		});

		expect(result.name).toBe('Nasi Goreng');
		expect(updateProductMock).toHaveBeenCalled();
		expect(updateProductFlagsMock).toHaveBeenCalled();
		expect(getProductByIdMock).toHaveBeenCalled();
	});

	it('throws when item not found after update', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		updateProductMock.mockResolvedValue(null);

		await expect(
			editMenuItem(USER, {
				restaurantSlug: 'bali-kafe',
				itemId: 'missing',
				input: {
					name: 'X',
					dietaryFlags: [],
					allergens: [],
					description: '',
					spiceLevel: 0,
					confidence: 'verified',
					itemId: 'missing',
					outlet: 'bali-kafe',
					price: 0,
					isAvailable: false
				}
			})
		).rejects.toThrow('not found or access denied');
	});
});

describe('toggleAvailability', () => {
	it('sets availability successfully', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		setProductAvailabilityMock.mockResolvedValue(true);

		await expect(
			toggleAvailability(USER, {
				restaurantSlug: 'bali-kafe',
				itemId: 'item-1',
				isAvailable: false
			})
		).resolves.toBeUndefined();

		expect(setProductAvailabilityMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ isAvailable: false })
		);
	});

	it('throws when item not found', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		setProductAvailabilityMock.mockResolvedValue(false);

		await expect(
			toggleAvailability(USER, {
				restaurantSlug: 'bali-kafe',
				itemId: 'missing',
				isAvailable: true
			})
		).rejects.toThrow('not found or access denied');
	});
});

describe('publishDraftMenu', () => {
	it('publishes draft catalog successfully', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		loadCatalogsForOutletMock.mockResolvedValue([{ id: 'cat-draft', status: 'draft', version: 1 }]);
		loadProductsForCatalogMock.mockResolvedValue([MOCK_PRODUCT]);
		publishCatalogMock.mockResolvedValue('cat-published');

		const result = await publishDraftMenu(USER, { restaurantSlug: 'bali-kafe' });

		expect(result).toBe('cat-published');
		expect(publishCatalogMock).toHaveBeenCalled();
	});

	it('throws when no draft catalog exists', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		loadCatalogsForOutletMock.mockResolvedValue([{ id: 'cat-pub', status: 'published', version: 1 }]);

		await expect(publishDraftMenu(USER, { restaurantSlug: 'bali-kafe' })).rejects.toThrow(
			'No draft catalog found'
		);
	});

	it('throws MenuPublishValidationError when draft catalog has zero products', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		loadCatalogsForOutletMock.mockResolvedValue([{ id: 'cat-draft', status: 'draft', version: 1 }]);
		loadProductsForCatalogMock.mockResolvedValue([]);

		await expect(publishDraftMenu(USER, { restaurantSlug: 'bali-kafe' })).rejects.toThrow(
			MenuPublishValidationError
		);
	});
});

describe('validateMenuForPublish', () => {
	it('returns ok for valid items', () => {
		const items: MenuItem[] = [
			{
				id: 'i1',
				category: 'Main',
				name: 'Nasi Goreng',
				localName: undefined,
				description: '',
				price: 50000,
				currency: 'IDR',
				image: '',
				spiceLevel: 0,
				isAvailable: true,
				isSignature: false,
				dietaryFlags: [],
				allergens: [],
				goodFor: [],
				confidence: 'verified'
			}
		];
		const result = validateMenuForPublish(items);
		expect(result.ok).toBe(true);
	});

	it('returns issues for items missing name', () => {
		const items: MenuItem[] = [
			{
				id: 'i1',
				category: 'Main',
				name: '',
				localName: undefined,
				description: '',
				price: 50000,
				currency: 'IDR',
				image: '',
				spiceLevel: 0,
				isAvailable: true,
				isSignature: false,
				dietaryFlags: [],
				allergens: [],
				goodFor: [],
				confidence: 'verified'
			}
		] as MenuItem[];
		const result = validateMenuForPublish(items);
		expect(result.ok).toBe(false);
		expect(result.issues.length).toBeGreaterThan(0);
	});
});
