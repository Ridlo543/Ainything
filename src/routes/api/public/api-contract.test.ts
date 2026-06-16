/**
 * API contract tests for the four public endpoints.
 *
 * Strategy: test the service layer that the routes delegate to.
 * Each test group mirrors one route's contract:
 *   - input validation (happy + bad input + missing fields)
 *   - tenant scope derived from bootstrap, never from body
 *   - correct result shape returned
 *
 * Mocks: repositories, LLM provider, rate limiter (all DB/Redis/network calls).
 * Rate limiting and AI cap are tested in their own files; here we just bypass them.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PublicMenuBootstrap } from '$lib/domain/menu/types';

// ── Common mock bootstrap ──────────────────────────────────────────────────────

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';

const bootstrap: PublicMenuBootstrap = {
	restaurant: {
		id: 'rest-1',
		organizationId: 'org-1',
		name: 'Uma Karang',
		menuItems: [
			{
				name: 'Nasi Goreng',
				category: 'Main',
				description: 'Fried rice',
				price: 85000,
				isAvailable: true,
				spiceLevel: 2,
				dietaryFlags: ['halal'],
				allergens: ['egg'],
				confidence: 'verified'
			}
		]
	} as PublicMenuBootstrap['restaurant'],
	table: {
		id: 'table-1',
		code: 'T07',
		label: 'Table 07',
		restaurantId: 'rest-1',
		organizationId: 'org-1'
	}
};

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/public/sessions  →  customer-session-service
// ════════════════════════════════════════════════════════════════════════════════

const createCustomerSessionMock = vi.fn();

vi.mock('$lib/server/repositories/public-menu-repository', () => ({
	createCustomerSession: (...args: unknown[]) => createCustomerSessionMock(...args),
	createFallbackRequest: vi.fn(),
	createFeedback: vi.fn()
}));

const { createCustomerSessionForTable } =
	await import('$lib/server/services/customer-session-service');

describe('POST /api/public/sessions — createCustomerSessionForTable', () => {
	beforeEach(() => {
		createCustomerSessionMock.mockReset();
		createCustomerSessionMock.mockResolvedValue({ id: 'sess-1' });
	});

	it('returns sessionId, languageTag, preferences on valid input', async () => {
		const result = await createCustomerSessionForTable(bootstrap, {
			restaurantSlug: 'uma-karang',
			tableCode: 'T07',
			languageTag: 'en',
			preferences: { dietary: ['halal'] }
		});

		expect(result.sessionId).toBeDefined();
		expect(result.languageTag).toBe('en');
		expect(result.preferences).toBeDefined();
	});

	it('derives organizationId and restaurantId from bootstrap — not from body', async () => {
		await createCustomerSessionForTable(bootstrap, {
			restaurantSlug: 'uma-karang',
			tableCode: 'T07',
			languageTag: 'en',
			// Hostile spoof attempt
			organizationId: 'evil-org',
			restaurantId: 'evil-rest'
		});

		expect(createCustomerSessionMock).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: 'org-1',
				restaurantId: 'rest-1'
			})
		);
	});

	it('rejects invalid languageTag', async () => {
		await expect(
			createCustomerSessionForTable(bootstrap, {
				restaurantSlug: 'uma-karang',
				tableCode: 'T07',
				languageTag: 'xx-invalid'
			})
		).rejects.toThrow();
		expect(createCustomerSessionMock).not.toHaveBeenCalled();
	});

	it('accepts all supported language tags without throwing', async () => {
		const tags = ['en', 'id', 'zh-Hans', 'ko', 'ja', 'ar', 'hi', 'fr', 'de'];

		for (const tag of tags) {
			createCustomerSessionMock.mockResolvedValue({ id: `sess-${tag}` });
			await expect(
				createCustomerSessionForTable(bootstrap, {
					restaurantSlug: 'uma-karang',
					tableCode: 'T07',
					languageTag: tag
				})
			).resolves.toBeDefined();
		}
	});
});

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/public/fallback  →  guest-interaction-service.createFallbackForTable
// ════════════════════════════════════════════════════════════════════════════════

const createFallbackRequestMock = vi.fn();
const createFeedbackMock = vi.fn();

vi.mock('$lib/server/repositories/public-menu-repository', () => ({
	createCustomerSession: createCustomerSessionMock,
	createFallbackRequest: (...args: unknown[]) => createFallbackRequestMock(...args),
	createFeedback: (...args: unknown[]) => createFeedbackMock(...args)
}));

const { createFallbackForTable, createFeedbackForSession } =
	await import('$lib/server/services/guest-interaction-service');

describe('POST /api/public/fallback — createFallbackForTable', () => {
	beforeEach(() => {
		createFallbackRequestMock.mockReset();
		createFallbackRequestMock.mockResolvedValue({ id: 'fb-1', status: 'new' });
	});

	it('returns fallbackId and status on valid input', async () => {
		const result = await createFallbackForTable(bootstrap, {
			languageTag: 'en',
			guestNeed: 'I need help with allergen information'
		});

		expect(result.fallbackId).toBe('fb-1');
		expect(result.status).toBe('new');
	});

	it('derives tenant scope from bootstrap — ignores body ids', async () => {
		await createFallbackForTable(bootstrap, {
			languageTag: 'en',
			guestNeed: 'Help me',
			organizationId: 'evil-org',
			restaurantId: 'evil-rest',
			tableId: 'evil-table'
		});

		expect(createFallbackRequestMock).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: 'org-1',
				restaurantId: 'rest-1',
				tableId: 'table-1'
			})
		);
	});

	it('rejects empty guestNeed → 422', async () => {
		await expect(
			createFallbackForTable(bootstrap, { languageTag: 'en', guestNeed: '  ' })
		).rejects.toThrow();
	});

	it('rejects guestNeed > 500 chars → 422', async () => {
		await expect(
			createFallbackForTable(bootstrap, {
				languageTag: 'en',
				guestNeed: 'x'.repeat(501)
			})
		).rejects.toThrow();
	});

	it('accepts high priority', async () => {
		await createFallbackForTable(bootstrap, {
			languageTag: 'en',
			guestNeed: 'Urgent help',
			priority: 'high'
		});

		expect(createFallbackRequestMock).toHaveBeenCalledWith(
			expect.objectContaining({ priority: 'high' })
		);
	});

	it('rejects unknown priority value → 422', async () => {
		await expect(
			createFallbackForTable(bootstrap, {
				languageTag: 'en',
				guestNeed: 'Help',
				priority: 'critical' // not in schema
			})
		).rejects.toThrow();
	});
});

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/public/feedback  →  guest-interaction-service.createFeedbackForSession
// ════════════════════════════════════════════════════════════════════════════════

describe('POST /api/public/feedback — createFeedbackForSession', () => {
	beforeEach(() => {
		createFeedbackMock.mockReset();
		createFeedbackMock.mockResolvedValue({ id: 'feedb-1' });
	});

	it('returns feedbackId on valid input', async () => {
		const result = await createFeedbackForSession(bootstrap, { helpful: true });
		expect(result.feedbackId).toBe('feedb-1');
	});

	it('derives tenant scope from bootstrap — ignores body organizationId', async () => {
		await createFeedbackForSession(bootstrap, {
			helpful: true,
			organizationId: 'evil-org'
		});

		expect(createFeedbackMock).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: 'org-1' })
		);
	});

	it('allows omitting all optional fields', async () => {
		const result = await createFeedbackForSession(bootstrap, {});
		expect(result.feedbackId).toBe('feedb-1');
	});

	it('trims and passes through comment', async () => {
		await createFeedbackForSession(bootstrap, { comment: '  great food  ' });
		expect(createFeedbackMock).toHaveBeenCalledWith(
			expect.objectContaining({ comment: 'great food' })
		);
	});

	it('rejects comment > 500 chars → 422', async () => {
		await expect(
			createFeedbackForSession(bootstrap, { comment: 'x'.repeat(501) })
		).rejects.toThrow();
	});

	it('rejects unknown issueType → 422', async () => {
		await expect(
			createFeedbackForSession(bootstrap, { issueType: 'totally-made-up' })
		).rejects.toThrow();
	});
});

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/public/chat  →  chat-service.handleChatTurn
// ════════════════════════════════════════════════════════════════════════════════

const getRecentHistoryMock = vi.fn();
const persistChatTurnMock = vi.fn();
const logAiEventMock = vi.fn();

vi.mock('$lib/server/repositories/chat-repository', () => ({
	getRecentHistory: (...args: unknown[]) => getRecentHistoryMock(...args),
	persistChatTurn: (...args: unknown[]) => persistChatTurnMock(...args)
}));

vi.mock('$lib/server/repositories/ai-events-repository', () => ({
	logAiEvent: (...args: unknown[]) => logAiEventMock(...args),
	safetyToConfidence: (s: string) =>
		({ ok: 1.0, 'low-confidence': 0.5, 'needs-staff': 0.3, blocked: 0.0 })[s] ?? 0.5
}));

const chatProviderMock = vi.fn();
vi.mock('$lib/server/providers/llm/factory', () => ({
	getLlmProvider: () => ({ chat: chatProviderMock })
}));

const { handleChatTurn } = await import('$lib/server/services/chat-service');

describe('POST /api/public/chat — handleChatTurn', () => {
	beforeEach(() => {
		getRecentHistoryMock.mockReset().mockResolvedValue([]);
		persistChatTurnMock.mockReset().mockResolvedValue({
			customerMessage: { id: 'cm-1' },
			assistantMessage: { id: 'am-1' }
		});
		chatProviderMock.mockReset().mockResolvedValue({
			answer: 'Nasi goreng is halal.',
			safetyStatus: 'ok',
			suggestFallback: false,
			provider: 'TokenRouter',
			model: 'MiniMax-M3',
			latencyMs: 420
		});
		logAiEventMock.mockReset().mockResolvedValue(undefined);
	});

	const validInput = {
		restaurantSlug: 'uma-karang',
		tableCode: 'T07',
		sessionId: SESSION_ID,
		content: 'Is the nasi goreng halal?',
		languageTag: 'en',
		dietaryPreferences: ['halal']
	};

	it('returns answer, safetyStatus, suggestFallback, message ids', async () => {
		const result = await handleChatTurn(bootstrap, validInput);

		expect(result).toMatchObject({
			answer: 'Nasi goreng is halal.',
			safetyStatus: 'ok',
			suggestFallback: false,
			customerMessageId: 'cm-1',
			assistantMessageId: 'am-1'
		});
	});

	it('passes menu items to LLM context', async () => {
		await handleChatTurn(bootstrap, validInput);
		const ctx = chatProviderMock.mock.calls[0][0] as { menuItems: unknown[] };
		expect(Array.isArray(ctx.menuItems)).toBe(true);
	});

	it('calls logAiEvent (fire-and-forget, not awaited by route)', async () => {
		await handleChatTurn(bootstrap, validInput);
		// logAiEvent is void-called; give event loop a tick
		await Promise.resolve();
		expect(logAiEventMock).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: 'org-1',
				restaurantId: 'rest-1',
				provider: 'TokenRouter',
				model: 'MiniMax-M3',
				eventType: 'chat'
			})
		);
	});

	it('rejects invalid sessionId → 422', async () => {
		await expect(
			handleChatTurn(bootstrap, { ...validInput, sessionId: 'not-a-uuid' })
		).rejects.toThrow();
		expect(chatProviderMock).not.toHaveBeenCalled();
	});

	it('rejects empty content → 422', async () => {
		await expect(handleChatTurn(bootstrap, { ...validInput, content: '' })).rejects.toThrow();
		expect(chatProviderMock).not.toHaveBeenCalled();
	});

	it('rejects content > 1000 chars → 422', async () => {
		await expect(
			handleChatTurn(bootstrap, { ...validInput, content: 'x'.repeat(1001) })
		).rejects.toThrow();
		expect(chatProviderMock).not.toHaveBeenCalled();
	});

	it('propagates needs-staff safetyStatus from LLM', async () => {
		chatProviderMock.mockResolvedValue({
			answer: 'Please ask staff.',
			safetyStatus: 'needs-staff',
			suggestFallback: true
		});

		const result = await handleChatTurn(bootstrap, validInput);
		expect(result.safetyStatus).toBe('needs-staff');
		expect(result.suggestFallback).toBe(true);
	});

	it('propagates blocked safetyStatus from LLM', async () => {
		chatProviderMock.mockResolvedValue({
			answer: 'Out of scope.',
			safetyStatus: 'blocked',
			suggestFallback: false
		});

		const result = await handleChatTurn(bootstrap, validInput);
		expect(result.safetyStatus).toBe('blocked');
	});
});
