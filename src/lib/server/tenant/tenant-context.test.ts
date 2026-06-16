import { describe, expect, it } from 'vitest';
import { demoUsers } from '$lib/mock/restaurants';
import { resolveMockTenantContext } from './tenant-context';

describe('resolveTenantContext', () => {
	it('returns only restaurants assigned to the user membership', () => {
		const owner = demoUsers.find((user) => user.id === 'user-owner-bali');
		if (!owner) throw new Error('missing owner demo user');

		const tenant = resolveMockTenantContext(owner);

		expect(tenant.organization.id).toBe('org-bali-table-group');
		expect(
			tenant.restaurants.every((restaurant) => restaurant.organizationId === tenant.organization.id)
		).toBe(true);
		expect(tenant.restaurants.some((restaurant) => restaurant.slug === 'taman-sate')).toBe(false);
	});

	it('falls back to an allowed restaurant when selected slug is outside membership', () => {
		const owner = demoUsers.find((user) => user.id === 'user-owner-bali');
		if (!owner) throw new Error('missing owner demo user');

		const tenant = resolveMockTenantContext(owner, 'taman-sate');

		expect(tenant.activeRestaurant.organizationId).toBe('org-bali-table-group');
		expect(tenant.activeRestaurant.slug).not.toBe('taman-sate');
	});
});
