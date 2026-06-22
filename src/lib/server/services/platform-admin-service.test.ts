import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPool } from '$lib/server/db/postgres';
import {
	PlatformAdminInputError,
	getPlatformStats,
	listOrganizations,
	listRestaurants
} from './platform-admin-service';

vi.mock('$lib/server/db/postgres', () => ({
	getPool: vi.fn()
}));

const pool = { query: vi.fn() };

beforeEach(() => {
	vi.mocked(getPool).mockReturnValue(pool as never);
	pool.query.mockReset();
});

describe('getPlatformStats', () => {
	it('returns platform totals from live platform tables', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [{ count: '3' }] })
			.mockResolvedValueOnce({ rows: [{ count: '7' }] })
			.mockResolvedValueOnce({ rows: [{ count: '12' }] });

		await expect(getPlatformStats()).resolves.toEqual({
			totalOrganizations: 3,
			totalRestaurants: 7,
			platformUsers: 12
		});
	});
});

describe('listOrganizations', () => {
	it('passes validated pagination to the platform organizations query', async () => {
		pool.query.mockResolvedValueOnce({
			rows: [
				{
					id: 'org-1',
					name: 'Acme Hospitality',
					slug: 'acme',
					plan: 'pro',
					status: 'active',
					restaurantCount: '2',
					userCount: '3',
					createdAt: '2026-06-21T00:00:00.000Z'
				}
			]
		});

		await expect(listOrganizations({ limit: 10, offset: 20 })).resolves.toEqual([
			{
				id: 'org-1',
				name: 'Acme Hospitality',
				slug: 'acme',
				plan: 'pro',
				status: 'active',
				restaurantCount: 2,
				userCount: 3,
				createdAt: '2026-06-21T00:00:00.000Z'
			}
		]);
		expect(pool.query).toHaveBeenCalledWith(
			expect.stringContaining('LIMIT $1 OFFSET $2'),
			[10, 20]
		);
	});

	it('rejects unbounded pagination before querying postgres', async () => {
		await expect(listOrganizations({ limit: 101 })).rejects.toThrow(PlatformAdminInputError);
		expect(pool.query).not.toHaveBeenCalled();
	});
});

describe('listRestaurants', () => {
	it('filters by organization id only when a valid uuid is provided', async () => {
		const organizationId = '00000000-0000-4000-8000-000000000001';
		pool.query.mockResolvedValueOnce({ rows: [] });

		await expect(listRestaurants({ limit: 10, offset: 0, organizationId })).resolves.toEqual([]);
		expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('$3::uuid'), [
			10,
			0,
			organizationId
		]);
	});

	it('rejects non-uuid organization ids before querying postgres', async () => {
		await expect(listRestaurants({ organizationId: 'not-a-uuid' })).rejects.toThrow(
			PlatformAdminInputError
		);
		expect(pool.query).not.toHaveBeenCalled();
	});
});
