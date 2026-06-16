import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PublicMenuBootstrap } from '$lib/domain/menu/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const getRecentHistoryMock = vi.fn();
const persistChatTurnMock = vi.fn();

vi.mock('$lib/server/repositories/chat-repository', () => ({
	getRecentHistory: (...args: unknown[]) => getRecentHistoryMock(...args),
	persistChatTurn: (...args: unknown[]) => persistChatTurnMock(...args)
}));

const chatMock = vi.fn();
const getLlmProviderMock = vi.fn(() => ({ chat: chatMock }));

vi.mock('$lib/server/providers/llm/factory', () => ({
	getLlmProvider: () => getLlmProviderMock()
}));

const { handleChatTurn } = await import('./chat-service');

// ── Fixtures ──────────────────────────────────────────────────────────────────

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
			},
			{
				name: 'Gado-Gado',
				category: 'Main',
				description: 'Vegetable salad with peanut sauce',
				price: 65000,
				isAvailable: true,
				spiceLevel: 0,
				dietaryFlags: ['vegetarian', 'halal'],
				allergens: ['nuts'],
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

const validInput = {
	sessionId: SESSION_ID,
	content: 'Is the nasi goreng halal?',
	languageTag: 'en'
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function resetMocks() {
	getRecentHistoryMock.mockReset();
	persistChatTurnMock.mockReset();
	chatMock.mockReset();

	getRecentHistoryMock.mockResolvedValue([]);
	chatMock.mockResolvedValue({
		answer: 'Yes, it is halal.',
		safetyStatus: 'ok',
		suggestFallback: false
	});
	persistChatTurnMock.mockResolvedValue({
		customerMessage: { id: 'msg-customer-1' },
		assistantMessage: { id: 'msg-assistant-1' }
	});
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('handleChatTurn — happy path', () => {
	beforeEach(resetMocks);

	it('returns answer, safetyStatus, and message ids from the LLM + repository', async () => {
		const result = await handleChatTurn(bootstrap, validInput);

		expect(result).toEqual({
			customerMessageId: 'msg-customer-1',
			assistantMessageId: 'msg-assistant-1',
			answer: 'Yes, it is halal.',
			safetyStatus: 'ok',
			suggestFallback: false
		});
	});

	it('passes restaurantId and restaurantName from the bootstrap to the LLM', async () => {
		await handleChatTurn(bootstrap, validInput);

		expect(chatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				restaurantId: 'rest-1',
				restaurantName: 'Uma Karang'
			})
		);
	});

	it('passes the guest question and languageTag to the LLM', async () => {
		await handleChatTurn(bootstrap, validInput);

		expect(chatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				question: 'Is the nasi goreng halal?',
				languageTag: 'en'
			})
		);
	});

	it('flattens menu item dietaryFlags into the LLM context (deduplicated)', async () => {
		await handleChatTurn(bootstrap, validInput);

		expect(chatMock).toHaveBeenCalledWith(
			expect.objectContaining({
				dietaryPreferences: expect.arrayContaining(['halal', 'vegetarian'])
			})
		);
		// halal appears in both items but should only be listed once
		const call = chatMock.mock.calls[0][0] as { dietaryPreferences: string[] };
		expect(call.dietaryPreferences.filter((p: string) => p === 'halal')).toHaveLength(1);
	});

	it('passes menu items snapshot to the LLM', async () => {
		await handleChatTurn(bootstrap, validInput);

		const call = chatMock.mock.calls[0][0] as { menuItems: unknown[] };
		expect(call.menuItems).toBeDefined();
		expect(Array.isArray(call.menuItems)).toBe(true);
		expect(call.menuItems.length).toBeGreaterThan(0);
	});

	it('passes conversation history from the repository to the LLM', async () => {
		const history = [
			{ role: 'customer' as const, content: 'Hi' },
			{ role: 'assistant' as const, content: 'Hello!' }
		];
		getRecentHistoryMock.mockResolvedValue(history);

		await handleChatTurn(bootstrap, validInput);

		expect(chatMock).toHaveBeenCalledWith(expect.objectContaining({ history }));
	});

	it('requests the last 10 messages for the given sessionId', async () => {
		await handleChatTurn(bootstrap, validInput);
		expect(getRecentHistoryMock).toHaveBeenCalledWith(SESSION_ID, 10);
	});

	it('persists the turn with answer content and safety status', async () => {
		await handleChatTurn(bootstrap, validInput);

		expect(persistChatTurnMock).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: 'org-1',
				restaurantId: 'rest-1',
				sessionId: SESSION_ID,
				customerContent: 'Is the nasi goreng halal?',
				assistantContent: 'Yes, it is halal.',
				assistantSafety: 'ok'
			})
		);
	});
});

describe('handleChatTurn — input validation', () => {
	beforeEach(resetMocks);

	it('rejects empty content', async () => {
		await expect(handleChatTurn(bootstrap, { ...validInput, content: '   ' })).rejects.toThrow();
		expect(chatMock).not.toHaveBeenCalled();
	});

	it('rejects content over 1000 chars', async () => {
		await expect(
			handleChatTurn(bootstrap, { ...validInput, content: 'x'.repeat(1001) })
		).rejects.toThrow();
		expect(chatMock).not.toHaveBeenCalled();
	});

	it('rejects an invalid sessionId (non-uuid)', async () => {
		await expect(
			handleChatTurn(bootstrap, { ...validInput, sessionId: 'not-a-uuid' })
		).rejects.toThrow();
		expect(chatMock).not.toHaveBeenCalled();
	});
});

describe('handleChatTurn — LLM safety statuses', () => {
	beforeEach(resetMocks);

	it('propagates needs-staff safetyStatus and suggestFallback', async () => {
		chatMock.mockResolvedValue({
			answer: 'Please ask staff.',
			safetyStatus: 'needs-staff',
			suggestFallback: true
		});

		const result = await handleChatTurn(bootstrap, validInput);

		expect(result.safetyStatus).toBe('needs-staff');
		expect(result.suggestFallback).toBe(true);
	});

	it('propagates blocked safetyStatus', async () => {
		chatMock.mockResolvedValue({
			answer: 'Out of scope.',
			safetyStatus: 'blocked',
			suggestFallback: false
		});

		const result = await handleChatTurn(bootstrap, validInput);

		expect(result.safetyStatus).toBe('blocked');
	});
});
