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
import type { PublicCatalogBootstrap } from '$lib/domain/outlet/types';

// ── Common mock bootstrap ──────────────────────────────────────────────────────

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';
const OUTLET_ID = '40000000-0000-0000-0000-000000000001';
const ORG_ID = '10000000-0000-0000-0000-000000000001';

const bootstrap: PublicCatalogBootstrap = {
	outlet: {
		id: OUTLET_ID,
		organizationId: ORG_ID,
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
		products: [
			{
				id: '70000000-0000-0000-0000-000000000001',
				section: 'Main',
				name: 'Nasi Goreng',
				description: 'Fried rice',
				price: 85000,
				currency: 'IDR',
				imageUrl: '',
				isAvailable: true,
				isSignature: false,
				confidence: 'verified',
				sortOrder: 0,
				dietaryFlags: ['halal'],
				allergens: ['egg'],
				goodFor: []
			}
		]
	},
	table: {
		id: '00000000-0000-0000-0000-000000000001',
		code: 'T07',
		label: 'Table 07',
		outletId: OUTLET_ID,
		organizationId: ORG_ID,
		isActive: true,
		qrPath: ''
	}
};

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/public/sessions  →  customer-session-service
// ════════════════════════════════════════════════════════════════════════════════

const createBuyerSessionMock = vi.fn();
const createFallbackRequestMock = vi.fn().mockResolvedValue({ id: 'fb-1', status: 'new' });
const createBuyerFeedbackMock = vi.fn().mockResolvedValue({ id: 'feedback-1' });

vi.mock('$lib/server/repositories/public-catalog-repository', () => ({
	createBuyerSession: (...args: unknown[]) => createBuyerSessionMock(...args),
	createFallbackRequest: (...args: unknown[]) => createFallbackRequestMock(...args),
	createBuyerFeedback: (...args: unknown[]) => createBuyerFeedbackMock(...args)
}));

const { createCustomerSessionForTable } =
	await import('$lib/server/services/customer-session-service');

describe('POST /api/public/sessions — createCustomerSessionForTable', () => {
	beforeEach(() => {
		createBuyerSessionMock.mockReset();
		createBuyerSessionMock.mockResolvedValue({ id: SESSION_ID });
	});

	it('derives tenant scope from bootstrap — ignores body ids', async () => {
		await createCustomerSessionForTable(bootstrap, {
			languageTag: 'en',
			dietaryPreferences: ['halal'],
			organizationId: 'attacker-org',
			outletId: 'attacker-outlet',
			tableId: 'attacker-table'
		});

		expect(createBuyerSessionMock).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: ORG_ID,
				outletId: OUTLET_ID,
				tableId: '00000000-0000-0000-0000-000000000001'
			})
		);
	});

	it('returns sessionId, languageTag, preferences', async () => {
		const result = await createCustomerSessionForTable(bootstrap, {
			languageTag: 'id',
			dietaryPreferences: ['halal']
		});

		expect(result.sessionId).toBe(SESSION_ID);
		expect(result.languageTag).toBe('id');
		expect(result.preferences.dietaryPreferences).toEqual(['halal']);
	});

	it('keeps allergenNotes only when provided', async () => {
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

	it('rejects unsupported language tag → throws', async () => {
		await expect(
			createCustomerSessionForTable(bootstrap, { languageTag: 'xx', dietaryPreferences: [] })
		).rejects.toThrow();
		expect(createBuyerSessionMock).not.toHaveBeenCalled();
	});

	it('rejects unknown dietary preference → throws', async () => {
		await expect(
			createCustomerSessionForTable(bootstrap, {
				languageTag: 'en',
				dietaryPreferences: ['definitely-not-real']
			})
		).rejects.toThrow();
		expect(createBuyerSessionMock).not.toHaveBeenCalled();
	});
});

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/public/fallback  →  guest-interaction-service.createFallbackForTable
// ════════════════════════════════════════════════════════════════════════════════

// Mocks already defined above — reuse createFallbackRequestMock and createBuyerFeedbackMock

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
			outletId: 'evil-outlet',
			tableId: 'evil-table'
		});

		expect(createFallbackRequestMock).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: ORG_ID,
				outletId: OUTLET_ID,
				tableId: '00000000-0000-0000-0000-000000000001'
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
		createBuyerFeedbackMock.mockReset();
		createBuyerFeedbackMock.mockResolvedValue({ id: 'feedb-1' });
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

		expect(createBuyerFeedbackMock).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: ORG_ID })
		);
	});

	it('allows omitting all optional fields', async () => {
		const result = await createFeedbackForSession(bootstrap, {});
		expect(result.feedbackId).toBe('feedb-1');
	});

	it('trims and passes through comment', async () => {
		await createFeedbackForSession(bootstrap, { comment: '  great food  ' });
		expect(createBuyerFeedbackMock).toHaveBeenCalledWith(
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
// POST /api/public/chat  →  chat-service.handleCatalogChatTurn
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

const { handleCatalogChatTurn } = await import('$lib/server/services/chat-service');

describe('POST /api/public/chat — handleCatalogChatTurn', () => {
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
		const result = await handleCatalogChatTurn(bootstrap, validInput);

		expect(result).toMatchObject({
			answer: 'Nasi goreng is halal.',
			safetyStatus: 'ok',
			suggestFallback: false,
			customerMessageId: 'cm-1',
			assistantMessageId: 'am-1'
		});
	});

	it('passes menu items to LLM context', async () => {
		await handleCatalogChatTurn(bootstrap, validInput);
		const ctx = chatProviderMock.mock.calls[0][0] as { menuItems: unknown[] };
		expect(Array.isArray(ctx.menuItems)).toBe(true);
	});

	it('rejects missing sessionId → throws', async () => {
		await expect(
			handleCatalogChatTurn(bootstrap, { ...validInput, sessionId: undefined })
		).rejects.toThrow();
		expect(chatProviderMock).not.toHaveBeenCalled();
	});

	it('rejects missing content → throws', async () => {
		await expect(
			handleCatalogChatTurn(bootstrap, { ...validInput, content: '' })
		).rejects.toThrow();
		expect(chatProviderMock).not.toHaveBeenCalled();
	});

	it('rejects content > 1000 chars → 422', async () => {
		await expect(
			handleCatalogChatTurn(bootstrap, { ...validInput, content: 'x'.repeat(1001) })
		).rejects.toThrow();
		expect(chatProviderMock).not.toHaveBeenCalled();
	});

	it('propagates needs-staff safetyStatus from LLM', async () => {
		chatProviderMock.mockResolvedValue({
			answer: 'Please ask staff.',
			safetyStatus: 'needs-staff',
			suggestFallback: true
		});

		const result = await handleCatalogChatTurn(bootstrap, validInput);
		expect(result.safetyStatus).toBe('needs-staff');
		expect(result.suggestFallback).toBe(true);
	});

	it('propagates blocked safetyStatus from LLM', async () => {
		chatProviderMock.mockResolvedValue({
			answer: 'Out of scope.',
			safetyStatus: 'blocked',
			suggestFallback: false
		});

		const result = await handleCatalogChatTurn(bootstrap, validInput);
		expect(result.safetyStatus).toBe('blocked');
	});
});
