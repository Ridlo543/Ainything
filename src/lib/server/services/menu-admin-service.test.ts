import { describe, it, expect, vi, beforeEach } from 'vitest';

const withUserContextMock = vi.fn();
const resolveTenantContextMock = vi.fn();
const findMenuItemByIdMock = vi.fn();
const loadMenusForRestaurantMock = vi.fn();
const loadMenuItemsForMenuMock = vi.fn();
const countMenuItemsMock = vi.fn();
const repoUpdateMenuItemMock = vi.fn();
const repoSetAvailabilityMock = vi.fn();
const repoUpdateFlagsMock = vi.fn();
const repoPublishMenuMock = vi.fn();
const generateEmbeddingsMock = vi.fn();

vi.mock('$lib/server/db/postgres', () => ({
	withUserContext: (...args: unknown[]) => withUserContextMock(...args)
}));

vi.mock('$lib/server/tenant/tenant-context', () => ({
	resolveTenantContext: (...args: unknown[]) => resolveTenantContextMock(...args)
}));

vi.mock('$lib/server/repositories/admin-menu-repository', () => ({
	findMenuItemById: (...args: unknown[]) => findMenuItemByIdMock(...args),
	loadMenusForRestaurant: (...args: unknown[]) => loadMenusForRestaurantMock(...args),
	loadMenuItemsForMenu: (...args: unknown[]) => loadMenuItemsForMenuMock(...args),
	countMenuItems: (...args: unknown[]) => countMenuItemsMock(...args),
	updateMenuItem: (...args: unknown[]) => repoUpdateMenuItemMock(...args),
	setMenuItemAvailability: (...args: unknown[]) => repoSetAvailabilityMock(...args),
	updateMenuItemFlags: (...args: unknown[]) => repoUpdateFlagsMock(...args),
	publishMenu: (...args: unknown[]) => repoPublishMenuMock(...args)
}));

vi.mock('$lib/server/config/env', () => ({
	appEnv: { embeddingEnabled: false }
}));

vi.mock('$lib/server/services/embedding-worker', () => ({
	generateEmbeddingsForRestaurant: (...args: unknown[]) => generateEmbeddingsMock(...args)
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
	withUserContextMock.mockImplementation(async (_userId: string, fn: Function) => fn({}));
});

const USER = {
	id: 'user-1',
	email: 'admin@test.com',
	name: 'Admin',
	platformRole: 'restaurant_admin' as const,
	memberships: [
		{ organizationId: 'org-1', restaurantIds: ['rest-1'], role: 'restaurant_admin' as const }
	]
};

const TENANT = {
	user: USER,
	activeRestaurant: { id: 'rest-1', slug: 'bali-kafe', organizationId: 'org-1' }
};

describe('editMenuItem', () => {
	it('updates item and returns full result', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		const updatedItem = { id: 'item-1', name: 'Nasi Goreng' };
		repoUpdateMenuItemMock.mockResolvedValue(updatedItem);
		repoUpdateFlagsMock.mockResolvedValue(undefined);
		findMenuItemByIdMock.mockResolvedValue({ ...updatedItem, dietaryFlags: [] });

		const result = await editMenuItem(USER, {
			restaurantSlug: 'bali-kafe',
			itemId: 'item-1',
			input: {
				name: 'Nasi Goreng',
				price: 50000,
				isAvailable: true,
				dietaryFlags: [],
				allergens: []
			} as any
		});

		expect(result.name).toBe('Nasi Goreng');
		expect(repoUpdateMenuItemMock).toHaveBeenCalled();
		expect(repoUpdateFlagsMock).toHaveBeenCalled();
	});

	it('throws when item not found after update', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		repoUpdateMenuItemMock.mockResolvedValue(null);

		await expect(
			editMenuItem(USER, {
				restaurantSlug: 'bali-kafe',
				itemId: 'missing',
				input: { name: 'X', dietaryFlags: [], allergens: [] } as any
			})
		).rejects.toThrow('not found or access denied');
	});
});

describe('toggleAvailability', () => {
	it('sets availability successfully', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		repoSetAvailabilityMock.mockResolvedValue(true);

		await expect(
			toggleAvailability(USER, {
				restaurantSlug: 'bali-kafe',
				itemId: 'item-1',
				isAvailable: false
			})
		).resolves.toBeUndefined();

		expect(repoSetAvailabilityMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ isAvailable: false })
		);
	});

	it('throws when item not found', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		repoSetAvailabilityMock.mockResolvedValue(false);

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
	it('publishes draft menu successfully', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		loadMenusForRestaurantMock.mockResolvedValue([
			{ id: 'menu-draft', status: 'draft', version: 1 }
		]);
		countMenuItemsMock.mockResolvedValue(5);
		loadMenuItemsForMenuMock.mockResolvedValue([
			{
				id: 'i1',
				name: 'A',
				price: 10000,
				isAvailable: true,
				dietaryFlags: [],
				allergens: []
			}
		]);
		repoPublishMenuMock.mockResolvedValue('menu-published');

		const result = await publishDraftMenu(USER, { restaurantSlug: 'bali-kafe' });

		expect(result).toBe('menu-published');
		expect(repoPublishMenuMock).toHaveBeenCalled();
	});

	it('throws when no draft menu exists', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		loadMenusForRestaurantMock.mockResolvedValue([
			{ id: 'menu-pub', status: 'published', version: 1 }
		]);

		await expect(publishDraftMenu(USER, { restaurantSlug: 'bali-kafe' })).rejects.toThrow(
			'No draft menu found'
		);
	});

	it('throws MenuPublishValidationError when draft has zero items', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		loadMenusForRestaurantMock.mockResolvedValue([
			{ id: 'menu-draft', status: 'draft', version: 1 }
		]);
		countMenuItemsMock.mockResolvedValue(0);

		await expect(publishDraftMenu(USER, { restaurantSlug: 'bali-kafe' })).rejects.toThrow(
			MenuPublishValidationError
		);
	});
});

describe('validateMenuForPublish', () => {
	it('returns ok for valid items', () => {
		const items = [
			{
				id: 'i1',
				name: 'Nasi Goreng',
				price: 50000,
				currency: 'IDR',
				category: 'Main',
				isAvailable: true,
				dietaryFlags: [],
				allergens: [],
				confidence: 'verified'
			}
		] as any;
		const result = validateMenuForPublish(items);
		expect(result.ok).toBe(true);
	});

	it('returns issues for items missing name', () => {
		const items = [
			{
				id: 'i1',
				name: '',
				price: 50000,
				currency: 'IDR',
				category: 'Main',
				isAvailable: true,
				dietaryFlags: [],
				allergens: [],
				confidence: 'verified'
			}
		] as any;
		const result = validateMenuForPublish(items);
		expect(result.ok).toBe(false);
		expect(result.issues.length).toBeGreaterThan(0);
	});
});
