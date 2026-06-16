import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const evalMock = vi.fn();
const getRedisClientMock = vi.fn(() => ({ eval: evalMock }));

vi.mock('$lib/server/cache/redis', () => ({
	getRedisClient: () => getRedisClientMock()
}));

vi.mock('$lib/server/config/env', () => ({
	appEnv: { nodeEnv: 'development', aiDailyCap: 3 }
}));

const { checkDailyAiCap } = await import('./ai-cost-cap');

describe('checkDailyAiCap', () => {
	beforeEach(() => {
		evalMock.mockReset();
		getRedisClientMock.mockClear();
	});

	it('returns allowed=true when count is below the cap', async () => {
		evalMock.mockResolvedValue(1);
		const result = await checkDailyAiCap('rest-1');
		expect(result.allowed).toBe(true);
		expect(result.count).toBe(1);
	});

	it('returns allowed=true when count equals the cap', async () => {
		evalMock.mockResolvedValue(3); // cap is 3
		const result = await checkDailyAiCap('rest-1');
		expect(result.allowed).toBe(true);
	});

	it('returns allowed=false when count exceeds the cap', async () => {
		evalMock.mockResolvedValue(4); // cap is 3
		const result = await checkDailyAiCap('rest-1');
		expect(result.allowed).toBe(false);
		expect(result.count).toBe(4);
	});

	it('uses restaurant-scoped Redis key with UTC date', async () => {
		evalMock.mockResolvedValue(1);
		await checkDailyAiCap('rest-abc');
		const call = evalMock.mock.calls[0] as [string, { keys: string[] }];
		expect(call[1].keys[0]).toMatch(/^ai-cap:rest-abc:\d{4}-\d{2}-\d{2}$/);
	});

	it('is fail-open — returns allowed=true when Redis throws', async () => {
		evalMock.mockRejectedValue(new Error('Redis down'));
		const result = await checkDailyAiCap('rest-1');
		expect(result.allowed).toBe(true);
		expect(result.count).toBe(0);
	});
});
