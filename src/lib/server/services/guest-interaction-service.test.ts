import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PublicCatalogBootstrap } from '$lib/domain/outlet/types';

const createFallbackRequest = vi.fn();
const createBuyerFeedback = vi.fn();

vi.mock('$lib/server/repositories/public-catalog-repository', () => ({
	createFallbackRequest: (...args: unknown[]) => createFallbackRequest(...args),
	createBuyerFeedback: (...args: unknown[]) => createBuyerFeedback(...args)
}));

const { createFallbackForTable, createFeedbackForSession } =
	await import('./guest-interaction-service');

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

describe('createFallbackForTable', () => {
	beforeEach(() => {
		createFallbackRequest.mockReset();
		createFallbackRequest.mockResolvedValue({ id: 'fb-1', status: 'new' });
	});

	it('derives tenant scope from the bootstrap, not the body', async () => {
		await createFallbackForTable(bootstrap, {
			languageTag: 'en',
			guestNeed: 'Need help with menu',
			// Hostile spoof attempts — must be ignored
			organizationId: 'evil-org',
			outletId: 'evil-outlet',
			tableId: 'evil-table'
		});

		expect(createFallbackRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: 'org-1',
				outletId: 'outlet-1',
				tableId: 'table-1'
			})
		);
	});

	it('passes sessionId through to the repository', async () => {
		await createFallbackForTable(bootstrap, {
			sessionId: '550e8400-e29b-41d4-a716-446655440000',
			languageTag: 'id',
			guestNeed: 'Tolong bantu',
			priority: 'high'
		});

		expect(createFallbackRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionId: '550e8400-e29b-41d4-a716-446655440000',
				priority: 'high'
			})
		);
	});

	it('rejects an empty guestNeed', async () => {
		await expect(
			createFallbackForTable(bootstrap, { languageTag: 'en', guestNeed: '  ' })
		).rejects.toThrow();
		expect(createFallbackRequest).not.toHaveBeenCalled();
	});

	it('rejects a guestNeed that exceeds 500 chars', async () => {
		await expect(
			createFallbackForTable(bootstrap, { languageTag: 'en', guestNeed: 'x'.repeat(501) })
		).rejects.toThrow();
		expect(createFallbackRequest).not.toHaveBeenCalled();
	});

	it('returns fallbackId and status from repository', async () => {
		const result = await createFallbackForTable(bootstrap, {
			languageTag: 'en',
			guestNeed: 'I need help with allergen information'
		});
		expect(result).toEqual({ fallbackId: 'fb-1', status: 'new' });
	});
});

describe('createFeedbackForSession', () => {
	beforeEach(() => {
		createBuyerFeedback.mockReset();
		createBuyerFeedback.mockResolvedValue({ id: 'feedb-1' });
	});

	it('derives tenant scope from the bootstrap, not the body', async () => {
		await createFeedbackForSession(bootstrap, {
			helpful: true,
			organizationId: 'evil-org'
		});

		expect(createBuyerFeedback).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: 'org-1',
				outletId: 'outlet-1'
			})
		);
	});

	it('allows omitting all optional fields', async () => {
		const result = await createFeedbackForSession(bootstrap, {});
		expect(result.feedbackId).toBe('feedb-1');
	});

	it('passes helpful flag through', async () => {
		await createFeedbackForSession(bootstrap, { helpful: true });
		const passed = createBuyerFeedback.mock.calls[0][0];
		expect(passed.helpful).toBe(true);
	});

	it('trims and passes through comment', async () => {
		await createFeedbackForSession(bootstrap, { comment: '  nice food  ' });
		const passed = createBuyerFeedback.mock.calls[0][0];
		expect(passed.comment).toBe('nice food');
	});

	it('rejects a comment that exceeds 500 chars', async () => {
		await expect(
			createFeedbackForSession(bootstrap, { comment: 'x'.repeat(501) })
		).rejects.toThrow();
		expect(createBuyerFeedback).not.toHaveBeenCalled();
	});

	it('rejects an unknown issue type', async () => {
		await expect(
			createFeedbackForSession(bootstrap, { issueType: 'totally-made-up' })
		).rejects.toThrow();
		expect(createBuyerFeedback).not.toHaveBeenCalled();
	});

	it('returns feedbackId from the repository', async () => {
		const result = await createFeedbackForSession(bootstrap, { helpful: true });
		expect(result).toEqual({ feedbackId: 'feedb-1' });
	});
});
