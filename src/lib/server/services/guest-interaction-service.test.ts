import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PublicMenuBootstrap } from '$lib/domain/menu/types';

const createFallbackRequest = vi.fn();
const createFeedback = vi.fn();

vi.mock('$lib/server/repositories/public-menu-repository', () => ({
	createFallbackRequest: (...args: unknown[]) => createFallbackRequest(...args),
	createFeedback: (...args: unknown[]) => createFeedback(...args)
}));

const { createFallbackForTable, createFeedbackForSession } =
	await import('./guest-interaction-service');

const bootstrap: PublicMenuBootstrap = {
	restaurant: { id: 'rest-1', organizationId: 'org-1' } as PublicMenuBootstrap['restaurant'],
	table: {
		id: 'table-1',
		code: 'T07',
		label: 'Table 07',
		restaurantId: 'rest-1',
		organizationId: 'org-1'
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
			restaurantId: 'evil-rest',
			tableId: 'evil-table'
		});

		expect(createFallbackRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: 'org-1',
				restaurantId: 'rest-1',
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

	it('rejects an invalid session uuid', async () => {
		await expect(
			createFallbackForTable(bootstrap, {
				sessionId: 'not-a-uuid',
				languageTag: 'en',
				guestNeed: 'Help'
			})
		).rejects.toThrow();
		expect(createFallbackRequest).not.toHaveBeenCalled();
	});

	it('returns fallbackId and status from the repository', async () => {
		const result = await createFallbackForTable(bootstrap, {
			languageTag: 'en',
			guestNeed: 'Need help'
		});

		expect(result).toEqual({ fallbackId: 'fb-1', status: 'new' });
	});
});

describe('createFeedbackForSession', () => {
	beforeEach(() => {
		createFeedback.mockReset();
		createFeedback.mockResolvedValue({ id: 'feedb-1' });
	});

	it('derives tenant scope from the bootstrap, not the body', async () => {
		await createFeedbackForSession(bootstrap, {
			helpful: true,
			organizationId: 'evil-org' // must be ignored
		});

		expect(createFeedback).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: 'org-1', restaurantId: 'rest-1' })
		);
	});

	it('allows omitting all optional fields', async () => {
		await createFeedbackForSession(bootstrap, {});
		expect(createFeedback).toHaveBeenCalledWith(
			expect.objectContaining({ helpful: undefined, issueType: undefined, comment: undefined })
		);
	});

	it('rejects an unknown issue type', async () => {
		await expect(
			createFeedbackForSession(bootstrap, { issueType: 'totally-made-up' })
		).rejects.toThrow();
		expect(createFeedback).not.toHaveBeenCalled();
	});

	it('trims and enforces max length on comment', async () => {
		await createFeedbackForSession(bootstrap, { comment: '  nice food  ' });
		const passed = createFeedback.mock.calls[0][0];
		expect(passed.comment).toBe('nice food');
	});

	it('rejects a comment that exceeds 500 chars', async () => {
		await expect(
			createFeedbackForSession(bootstrap, { comment: 'x'.repeat(501) })
		).rejects.toThrow();
		expect(createFeedback).not.toHaveBeenCalled();
	});

	it('returns feedbackId from the repository', async () => {
		const result = await createFeedbackForSession(bootstrap, { helpful: true });
		expect(result).toEqual({ feedbackId: 'feedb-1' });
	});
});
