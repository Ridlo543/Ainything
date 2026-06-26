import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PublicCatalogBootstrap } from '$lib/domain/outlet/types';

const createBuyerSessionMock = vi.fn();

vi.mock('$lib/server/repositories/public-catalog-repository', () => ({
	createBuyerSession: (...args: unknown[]) => createBuyerSessionMock(...args)
}));

const { createCustomerSessionForTable } = await import('./customer-session-service');

const bootstrap: PublicCatalogBootstrap = {
	outlet: {
		id: 'outlet-1',
		organizationId: 'org-1',
		name: 'Uma Karang',
		slug: 'uma-karang',
		publicHost: '',
		location: '',
		businessType: 'restaurant',
		status: 'active',
		timezone: 'Asia/Makassar',
		defaultLanguageTag: 'id',
		languages: ['id', 'en'],
		heroImage: '',
		tableCount: 0,
		description: '',
		knowledgeHighlights: [],
		analytics: {
			scansToday: 0,
			helpfulRate: 0,
			fallbackRate: 0,
			topQuestion: '',
			topItem: ''
		},
		checkoutSettings: {
			checkoutMode: 'offline',
			requireBuyerWhatsapp: false,
			paymentConfirmationEnabled: false
		},
		sections: [],
		products: []
	},
	table: {
		id: 'table-1',
		code: 'T07',
		label: 'Table 07',
		outletId: 'outlet-1',
		organizationId: 'org-1',
		isActive: true,
		qrPath: ''
	}
};

describe('createCustomerSessionForTable', () => {
	beforeEach(() => {
		createBuyerSessionMock.mockReset();
		createBuyerSessionMock.mockResolvedValue({ id: 'session-1' });
	});

	it('derives tenant scope from the bootstrap, never from the request body', async () => {
		await createCustomerSessionForTable(bootstrap, {
			languageTag: 'en',
			dietaryPreferences: ['halal'],
			// Hostile body trying to spoof tenant scope; must be ignored.
			organizationId: 'attacker-org',
			outletId: 'attacker-outlet',
			tableId: 'attacker-table'
		});

		expect(createBuyerSessionMock).toHaveBeenCalledTimes(1);
		expect(createBuyerSessionMock).toHaveBeenCalledWith({
			organizationId: 'org-1',
			outletId: 'outlet-1',
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

		const passed = createBuyerSessionMock.mock.calls[0][0];
		expect(passed.preferences).toEqual({
			dietaryPreferences: [],
			allergenNotes: 'no peanuts'
		});
	});

	it('rejects an unsupported language tag', async () => {
		await expect(
			createCustomerSessionForTable(bootstrap, { languageTag: 'xx', dietaryPreferences: [] })
		).rejects.toThrow();
		expect(createBuyerSessionMock).not.toHaveBeenCalled();
	});

	it('rejects an unknown dietary preference', async () => {
		await expect(
			createCustomerSessionForTable(bootstrap, {
				languageTag: 'en',
				dietaryPreferences: ['definitely-not-real']
			})
		).rejects.toThrow();
		expect(createBuyerSessionMock).not.toHaveBeenCalled();
	});
});
