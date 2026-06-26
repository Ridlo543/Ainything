import { describe, expect, it } from 'vitest';
import type { AuthUser } from '$lib/domain/auth/types';
import { resolveMockTenantContext } from './tenant-context';

// Inline fixture — two outlets in org-bali-table-group only.
// 'outlet-rempah-terrace' intentionally absent (belongs to a different org).
const ownerBali: AuthUser = {
	id: 'user-owner-bali',
	email: 'owner@bali.test',
	name: 'Bali Owner',
	platformRole: 'org_owner',
	memberships: [
		{
			organizationId: 'org-bali-table-group',
			outletIds: ['outlet-bali-seminyak', 'outlet-bali-ubud'],
			role: 'org_owner'
		}
	]
};

describe('resolveMockTenantContext', () => {
	it('returns only outlets assigned to the user membership', () => {
		const tenant = resolveMockTenantContext(ownerBali);

		expect(tenant.organization.id).toBe('org-bali-table-group');
		expect(tenant.outlets.every((outlet) => outlet.organizationId === tenant.organization.id)).toBe(
			true
		);
		expect(tenant.outlets.some((outlet) => outlet.slug === 'outlet-rempah-terrace')).toBe(false);
	});

	it('falls back to an allowed outlet when selected slug is outside membership', () => {
		// 'outlet-rempah-terrace' belongs to org-jakarta-hospitality, not org-bali-table-group
		const tenant = resolveMockTenantContext(ownerBali, 'outlet-rempah-terrace');

		expect(tenant.activeOutlet.organizationId).toBe('org-bali-table-group');
		expect(tenant.activeOutlet.slug).not.toBe('outlet-rempah-terrace');
	});
});
