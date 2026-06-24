import { describe, it, expect, vi, beforeEach } from 'vitest';

const checkRateLimitMock = vi.fn();

vi.mock('$lib/server/services/rate-limiter', () => ({
	checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args)
}));

const errorMock = vi.fn();

vi.mock('@sveltejs/kit', () => ({
	error: (...args: unknown[]) => errorMock(...args)
}));

const { getRateLimitKey, applyRateLimit, checkBodySize } = await import('./public-api-helpers');

beforeEach(() => {
	vi.clearAllMocks();
	errorMock.mockImplementation((status: number, message: string) => {
		const err = new Error(message);
		(err as unknown as Record<string, unknown>).status = status;
		throw err;
	});
});

function makeRequest(headers: Record<string, string>): Request {
	return new Request('http://localhost/api/test', {
		method: 'POST',
		headers
	});
}

describe('getRateLimitKey', () => {
	it('uses x-session-token when present', () => {
		const req = makeRequest({ 'x-session-token': 'abc123def456' });
		expect(getRateLimitKey(req)).toBe('tok:abc123def456');
	});

	it('truncates long session tokens to 64 chars', () => {
		const longToken = 'a'.repeat(100);
		const req = makeRequest({ 'x-session-token': longToken });
		expect(getRateLimitKey(req)).toBe(`tok:${'a'.repeat(64)}`);
	});

	it('falls back to x-forwarded-for when no session token', () => {
		const req = makeRequest({ 'x-forwarded-for': '203.0.113.50, 10.0.0.1' });
		expect(getRateLimitKey(req)).toBe('ip:203.0.113.50');
	});

	it('trims whitespace from forwarded IP', () => {
		const req = makeRequest({ 'x-forwarded-for': '  192.168.1.1 ' });
		expect(getRateLimitKey(req)).toBe('ip:192.168.1.1');
	});

	it('returns "unknown" when neither header present', () => {
		const req = makeRequest({});
		expect(getRateLimitKey(req)).toBe('unknown');
	});

	it('prefers session token over forwarded IP', () => {
		const req = makeRequest({
			'x-session-token': 'my-token',
			'x-forwarded-for': '1.2.3.4'
		});
		expect(getRateLimitKey(req)).toBe('tok:my-token');
	});
});

describe('applyRateLimit', () => {
	it('does not throw when rate limit allows', async () => {
		checkRateLimitMock.mockResolvedValue({ allowed: true });
		const req = makeRequest({ 'x-session-token': 'tok123' });

		await expect(applyRateLimit('chat', req)).resolves.toBeUndefined();
		expect(checkRateLimitMock).toHaveBeenCalledWith('chat', 'tok:tok123');
	});

	it('throws 429 when rate limit exceeded', async () => {
		checkRateLimitMock.mockResolvedValue({ allowed: false, retryAfterSec: 30 });
		const req = makeRequest({ 'x-session-token': 'tok123' });

		await expect(applyRateLimit('chat', req)).rejects.toThrow('Rate limit reached');
		expect(errorMock).toHaveBeenCalledWith(429, expect.stringContaining('30'));
	});
});

describe('checkBodySize', () => {
	it('does not throw when no content-length header', () => {
		const req = makeRequest({});
		expect(() => checkBodySize(req)).not.toThrow();
	});

	it('does not throw when content-length is under limit', () => {
		const req = makeRequest({ 'content-length': '1024' });
		expect(() => checkBodySize(req)).not.toThrow();
	});

	it('throws 413 when content-length exceeds default limit', () => {
		const req = makeRequest({ 'content-length': '1000000' });
		expect(() => checkBodySize(req)).toThrow('Request body too large');
	});

	it('throws 413 when content-length exceeds custom limit', () => {
		const req = makeRequest({ 'content-length': '2048' });
		expect(() => checkBodySize(req, 1024)).toThrow('Request body too large');
	});

	it('ignores non-numeric content-length', () => {
		const req = makeRequest({ 'content-length': 'abc' });
		expect(() => checkBodySize(req)).not.toThrow();
	});
});
