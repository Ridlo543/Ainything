import { describe, it, expect } from 'vitest';
import { getLimitsForTier, checkLimit } from './usage-limits';

describe('getLimitsForTier', () => {
	it('returns free tier limits', () => {
		const limits = getLimitsForTier('free');
		expect(limits.maxRestaurants).toBe(1);
		expect(limits.maxMenuItemsPerRestaurant).toBe(50);
		expect(limits.maxAiCallsPerDay).toBe(30);
	});

	it('returns starter tier limits', () => {
		const limits = getLimitsForTier('starter');
		expect(limits.maxRestaurants).toBe(3);
		expect(limits.maxMenuItemsPerRestaurant).toBe(200);
	});

	it('returns pro tier limits', () => {
		const limits = getLimitsForTier('pro');
		expect(limits.maxRestaurants).toBe(20);
		expect(limits.maxMenuItemsPerRestaurant).toBe(1000);
	});

	it('falls back to free for unknown tier', () => {
		const limits = getLimitsForTier('enterprise' as never);
		expect(limits.maxRestaurants).toBe(1);
	});
});

describe('checkLimit', () => {
	it('allows when under limit', () => {
		const result = checkLimit(5, 10, 'menu items');
		expect(result.allowed).toBe(true);
		expect(result.reason).toBeUndefined();
	});

	it('blocks when at limit', () => {
		const result = checkLimit(10, 10, 'menu items');
		expect(result.allowed).toBe(false);
		expect(result.reason).toContain('limit reached');
	});

	it('blocks when over limit', () => {
		const result = checkLimit(15, 10, 'menu items');
		expect(result.allowed).toBe(false);
		expect(result.reason).toContain('15/10');
	});

	it('allows zero when limit is greater than zero', () => {
		const result = checkLimit(0, 10, 'items');
		expect(result.allowed).toBe(true);
	});
});
