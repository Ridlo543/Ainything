import { describe, it, expect, vi, beforeEach } from 'vitest';

const listActiveTablesForRestaurantMock = vi.fn();
const resolveTenantContextMock = vi.fn();

vi.mock('$lib/server/repositories/table-repository', () => ({
	listActiveTablesForRestaurant: (...args: unknown[]) => listActiveTablesForRestaurantMock(...args)
}));

vi.mock('$lib/server/tenant/tenant-context', () => ({
	resolveTenantContext: (...args: unknown[]) => resolveTenantContextMock(...args)
}));

const { listTables } = await import('./table-service');

beforeEach(() => {
	vi.clearAllMocks();
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

describe('listTables', () => {
	it('resolves tenant context and returns tables', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		const mockTables = [
			{ id: 't-1', code: 'A1', seats: 4, status: 'active' },
			{ id: 't-2', code: 'A2', seats: 2, status: 'active' }
		];
		listActiveTablesForRestaurantMock.mockResolvedValue(mockTables);

		const result = await listTables(USER, { restaurantSlug: 'bali-kafe' });

		expect(resolveTenantContextMock).toHaveBeenCalledWith(USER, 'bali-kafe');
		expect(listActiveTablesForRestaurantMock).toHaveBeenCalledWith('rest-1');
		expect(result).toEqual(mockTables);
	});

	it('returns empty array when no tables found', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		listActiveTablesForRestaurantMock.mockResolvedValue([]);

		const result = await listTables(USER, { restaurantSlug: 'bali-kafe' });

		expect(result).toEqual([]);
	});

	it('propagates tenant resolution errors', async () => {
		resolveTenantContextMock.mockRejectedValue(new Error('Not a member'));

		await expect(listTables(USER, { restaurantSlug: 'unknown' })).rejects.toThrow('Not a member');
	});

	it('propagates database errors from repository', async () => {
		resolveTenantContextMock.mockResolvedValue(TENANT);
		listActiveTablesForRestaurantMock.mockRejectedValue(new Error('DB connection failed'));

		await expect(listTables(USER, { restaurantSlug: 'bali-kafe' })).rejects.toThrow(
			'DB connection failed'
		);
	});
});
