import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module under test
const queryMock = vi.fn();
const PROMPT_VERSION_MOCK = 'v2';

vi.mock('$lib/server/db/postgres', () => ({
	query: (...args: unknown[]) => queryMock(...args)
}));

vi.mock('$lib/server/providers/llm/prompt', () => ({
	PROMPT_VERSION: PROMPT_VERSION_MOCK
}));

const { logAiEvent, safetyToConfidence } = await import('./ai-events-repository');

describe('safetyToConfidence', () => {
	it('maps ok → 1.0', () => expect(safetyToConfidence('ok')).toBe(1.0));
	it('maps low-confidence → 0.5', () => expect(safetyToConfidence('low-confidence')).toBe(0.5));
	it('maps needs-staff → 0.3', () => expect(safetyToConfidence('needs-staff')).toBe(0.3));
	it('maps blocked → 0.0', () => expect(safetyToConfidence('blocked')).toBe(0.0));
	it('maps unknown → 0.5 (default)', () => expect(safetyToConfidence('unknown-code')).toBe(0.5));
});

describe('logAiEvent', () => {
	beforeEach(() => {
		queryMock.mockReset();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const baseInput = {
		organizationId: 'org-1',
		restaurantId: 'rest-1',
		provider: 'TokenRouter',
		model: 'MiniMax-M3',
		eventType: 'chat' as const
	};

	it('calls INSERT with required fields', async () => {
		queryMock.mockResolvedValue({ rows: [] });
		await logAiEvent(baseInput);

		expect(queryMock).toHaveBeenCalledOnce();
		const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
		expect(sql).toContain('INSERT INTO ai_events');
		expect(params).toContain('org-1');
		expect(params).toContain('rest-1');
		expect(params).toContain('TokenRouter');
		expect(params).toContain('MiniMax-M3');
		expect(params).toContain('chat');
	});

	it('uses PROMPT_VERSION when promptVersion is omitted', async () => {
		queryMock.mockResolvedValue({ rows: [] });
		await logAiEvent(baseInput);
		const [, params] = queryMock.mock.calls[0] as [string, unknown[]];
		expect(params).toContain(PROMPT_VERSION_MOCK);
	});

	it('uses explicit promptVersion when provided', async () => {
		queryMock.mockResolvedValue({ rows: [] });
		await logAiEvent({ ...baseInput, promptVersion: 'v1' });
		const [, params] = queryMock.mock.calls[0] as [string, unknown[]];
		expect(params).toContain('v1');
	});

	it('passes sessionId as null when omitted', async () => {
		queryMock.mockResolvedValue({ rows: [] });
		await logAiEvent(baseInput);
		const [, params] = queryMock.mock.calls[0] as [string, unknown[]];
		expect(params).toContain(null);
	});

	it('passes sessionId when provided', async () => {
		queryMock.mockResolvedValue({ rows: [] });
		const sid = '550e8400-e29b-41d4-a716-446655440000';
		await logAiEvent({ ...baseInput, sessionId: sid });
		const [, params] = queryMock.mock.calls[0] as [string, unknown[]];
		expect(params).toContain(sid);
	});

	it('is fail-open — does not throw when query rejects', async () => {
		queryMock.mockRejectedValue(new Error('DB down'));
		await expect(logAiEvent(baseInput)).resolves.toBeUndefined();
		expect(console.error).toHaveBeenCalled();
	});

	it('serialises retrievedRefs as JSON array', async () => {
		queryMock.mockResolvedValue({ rows: [] });
		await logAiEvent({ ...baseInput, retrievedRefs: [{ id: 'ref-1' }] });
		const [, params] = queryMock.mock.calls[0] as [string, unknown[]];
		expect(params).toContain('[{"id":"ref-1"}]');
	});

	it('defaults retrievedRefs to empty JSON array', async () => {
		queryMock.mockResolvedValue({ rows: [] });
		await logAiEvent(baseInput);
		const [, params] = queryMock.mock.calls[0] as [string, unknown[]];
		expect(params).toContain('[]');
	});
});
