import { describe, expect, it, vi } from 'vitest';

// Mock the env so REDIS_URL being absent doesn't throw during import.
vi.mock('$lib/server/config/env', () => ({
	appEnv: { nodeEnv: 'test', redisUrl: undefined }
}));

// Mock the redis module to ensure it is never called in unit tests.
vi.mock('$lib/server/cache/redis', () => ({
	getRedisClient: vi.fn().mockRejectedValue(new Error('Redis should not be called in tests'))
}));

const { checkRateLimit, rateLimitDescription } = await import('./rate-limiter');

describe('checkRateLimit', () => {
	it('always allows in test environment (no Redis call)', async () => {
		const result = await checkRateLimit('chat', 'some-key');
		expect(result).toEqual({ allowed: true });
	});

	it('allows every endpoint type in test environment', async () => {
		for (const endpoint of ['session-create', 'chat', 'fallback', 'feedback'] as const) {
			const result = await checkRateLimit(endpoint, 'key');
			expect(result.allowed).toBe(true);
		}
	});
});

describe('rateLimitDescription', () => {
	it('returns a human-readable description for each endpoint', () => {
		expect(rateLimitDescription('session-create')).toMatch(/\d+ requests per \d+s/);
		expect(rateLimitDescription('chat')).toMatch(/\d+ requests per \d+s/);
		expect(rateLimitDescription('fallback')).toMatch(/\d+ requests per \d+s/);
		expect(rateLimitDescription('feedback')).toMatch(/\d+ requests per \d+s/);
	});
});
