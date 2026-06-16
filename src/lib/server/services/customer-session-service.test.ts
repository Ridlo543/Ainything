import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PublicMenuBootstrap } from '$lib/domain/menu/types';

const createCustomerSession = vi.fn();

vi.mock('$lib/server/repositories/public-menu-repository', () => ({
	createCustomerSession: (...args: unknown[]) => createCustomerSession(...args)
}));

const { createCustomerSessionForTable } = await import('./customer-session-service');

const bootstrap: PublicMenuBootstrap = {
	// Restaurant fields are not exercised by the service; cast through a minimal stub.
	restaurant: { id: 'rest-1', organizationId: 'org-1' } as PublicMenuBootstrap['restaurant'],
	table: {
		id: 'table-1',
		code: 'T07',
		label: 'Table 07',
		restaurantId: 'rest-1',
		organizationId: 'org-1'
	}
};

describe('createCustomerSessionForTable', () => {
	beforeEach(() => {
		createCustomerSession.mockReset();
		createCustomerSession.mockResolvedValue({ id: 'session-1' });
	});

	it('derives tenant scope from the bootstrap, never from the request body', async () => {
		await createCustomerSessionForTable(bootstrap, {
			languageTag: 'en',
			dietaryPreferences: ['halal'],
			// Hostile body trying to spoof tenant scope; must be ignored.
			organizationId: 'attacker-org',
			restaurantId: 'attacker-rest',
			tableId: 'attacker-table'
		});

		expect(createCustomerSession).toHaveBeenCalledTimes(1);
		expect(createCustomerSession).toHaveBeenCalledWith({
			organizationId: 'org-1',
			restaurantId: 'rest-1',
			tableId: 'table-1',
			languageTag: 'en',
			preferences: { dietaryPreferences: ['halal'] }
		});
	});

	it('keeps allergen notes only when provided', async () => {
		await createCustomerSessionForTable(bootstrap, {
			languageTag: 'id',
			dietaryPreferences: [],
			allergenNotes: '  no peanuts  '
		});

		const passed = createCustomerSession.mock.calls[0][0];
		expect(passed.preferences).toEqual({
			dietaryPreferences: [],
			allergenNotes: 'no peanuts'
		});
	});

	it('rejects an unsupported language tag', async () => {
		await expect(
			createCustomerSessionForTable(bootstrap, { languageTag: 'xx', dietaryPreferences: [] })
		).rejects.toThrow();
		expect(createCustomerSession).not.toHaveBeenCalled();
	});

	it('rejects an unknown dietary preference', async () => {
		await expect(
			createCustomerSessionForTable(bootstrap, {
				languageTag: 'en',
				dietaryPreferences: ['definitely-not-real']
			})
		).rejects.toThrow();
		expect(createCustomerSession).not.toHaveBeenCalled();
	});
});
