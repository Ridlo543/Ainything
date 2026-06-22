import { describe, it, expect } from 'vitest';
import { calculateCost } from './provider-cost-tracking';

// Expose calculateCost for testing — we test the pricing logic directly
// since DB queries require infrastructure. The mock path uses in-memory data.

describe('cost calculation', () => {
	it('returns 0 for unknown model', () => {
		expect(calculateCost('unknown-model', 1_000_000, 1_000_000)).toBe(0);
	});

	it('calculates MiniMax-M3 as free', () => {
		expect(calculateCost('MiniMax-M3', 10_000_000, 5_000_000)).toBe(0);
	});

	it('calculates gpt-4o-mini correctly', () => {
		// $0.15/1M input, $0.60/1M output
		// 1M input = $0.15, 500k output = $0.30
		const cost = calculateCost('gpt-4o-mini', 1_000_000, 500_000);
		expect(cost).toBeCloseTo(0.45, 4);
	});

	it('calculates claude-haiku-4-5 correctly', () => {
		// $0.80/1M input, $4.00/1M output
		const cost = calculateCost('claude-haiku-4-5', 500_000, 250_000);
		expect(cost).toBeCloseTo(1.4, 2);
	});

	it('calculates text-embedding-3-small correctly', () => {
		// $0.02/1M input only
		const cost = calculateCost('text-embedding-3-small', 500_000, 0);
		expect(cost).toBeCloseTo(0.01, 4);
	});

	it('returns 0 for zero tokens', () => {
		expect(calculateCost('gpt-4o-mini', 0, 0)).toBe(0);
	});
});
