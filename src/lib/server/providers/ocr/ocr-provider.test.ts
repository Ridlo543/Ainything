import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const appEnvMock = {
	ocrProvider: 'mock' as string
};

vi.mock('$lib/server/config/env', () => ({ appEnv: appEnvMock }));

const MockOcrProviderCtor = vi.fn();

vi.mock('./mock-provider', () => ({
	MockOcrProvider: MockOcrProviderCtor
}));

const { getOcrProvider } = await import('./factory');

import type { OcrScanInput } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getRealMockProvider() {
	const actual = await vi.importActual<typeof import('./mock-provider')>('./mock-provider');
	return new actual.MockOcrProvider();
}

function resetMocks() {
	MockOcrProviderCtor.mockReset();
	appEnvMock.ocrProvider = 'mock';
}

function makeInput(overrides?: Partial<OcrScanInput>): OcrScanInput {
	return {
		imageBase64: 'iVBORw0KGgo...',
		mimeType: 'image/png',
		sourceType: 'photo',
		languageHints: ['en', 'id'],
		restaurantName: 'Test Restaurant',
		...overrides
	};
}

// ── Factory Tests ─────────────────────────────────────────────────────────────

describe('getOcrProvider', () => {
	beforeEach(resetMocks);

	it("returns MockOcrProvider when OCR_PROVIDER='mock'", () => {
		appEnvMock.ocrProvider = 'mock';
		getOcrProvider();
		expect(MockOcrProviderCtor).toHaveBeenCalledOnce();
	});

	it('falls back to MockOcrProvider for unknown provider names', () => {
		appEnvMock.ocrProvider = 'nonexistent';
		getOcrProvider();
		expect(MockOcrProviderCtor).toHaveBeenCalledOnce();
	});

	it('falls back to MockOcrProvider when OCR_PROVIDER is empty', () => {
		appEnvMock.ocrProvider = '';
		getOcrProvider();
		expect(MockOcrProviderCtor).toHaveBeenCalledOnce();
	});
});

// ── MockOcrProvider Tests ─────────────────────────────────────────────────────

describe('MockOcrProvider', () => {
	it('returns items with per-field confidence scores', async () => {
		const provider = await getRealMockProvider();
		const result = await provider.scan(makeInput());

		expect(result.items.length).toBeGreaterThanOrEqual(1);
		for (const item of result.items) {
			expect(typeof item.name).toBe('string');
			expect(item.name.length).toBeGreaterThan(0);
			expect(item.nameConfidence).toBeGreaterThan(0);
			expect(item.nameConfidence).toBeLessThanOrEqual(1);
			expect(typeof item.category).toBe('string');
			expect(item.categoryConfidence).toBeGreaterThan(0);
			expect(typeof item.description).toBe('string');
			expect(item.descriptionConfidence).toBeGreaterThan(0);
			expect(typeof item.price).toBe('number');
			expect(item.price).toBeGreaterThan(0);
			expect(item.priceConfidence).toBeGreaterThan(0);
			expect(item.currency).toBe('IDR');
			expect(item.spiceLevel).toBeGreaterThanOrEqual(0);
			expect(item.spiceLevel).toBeLessThanOrEqual(5);
			expect(typeof item.isSignature).toBe('boolean');
		}
	});

	it('returns raw text containing menu names', async () => {
		const provider = await getRealMockProvider();
		const result = await provider.scan(makeInput());

		expect(typeof result.rawText).toBe('string');
		expect(result.rawText.length).toBeGreaterThan(0);
		expect(result.rawText).toContain('NASI GORENG');
	});

	it('returns issues flagged for review', async () => {
		const provider = await getRealMockProvider();
		const result = await provider.scan(makeInput());

		expect(result.issues.length).toBeGreaterThanOrEqual(1);
		for (const issue of result.issues) {
			expect(typeof issue.id).toBe('string');
			expect(typeof issue.label).toBe('string');
			expect(typeof issue.issue).toBe('string');
			expect(issue.status).toBe('needs-review');
		}
	});

	it('returns provider and model metadata', async () => {
		const provider = await getRealMockProvider();
		const result = await provider.scan(makeInput());

		expect(result.provider).toBe('mock');
		expect(result.model).toBe('mock-ocr-v1');
		expect(typeof result.latencyMs).toBe('number');
	});

	it('includes expected menu categories', async () => {
		const provider = await getRealMockProvider();
		const result = await provider.scan(makeInput());

		const categories = result.items.map((i) => i.category);
		expect(categories).toContain('Mains');
		expect(categories).toContain('Starters');
		expect(categories).toContain('Sides');
		expect(categories).toContain('Desserts');
	});

	it('includes dietary flags for all items', async () => {
		const provider = await getRealMockProvider();
		const result = await provider.scan(makeInput());

		const hasSpicy = result.items.some((i) => i.dietaryFlags.includes('spicy'));
		const hasVegetarian = result.items.some((i) => i.dietaryFlags.includes('vegetarian'));
		expect(hasSpicy).toBe(true);
		expect(hasVegetarian).toBe(true);
	});

	it('is deterministic — same input yields identical output', async () => {
		const provider = await getRealMockProvider();
		const input = makeInput();
		const a = await provider.scan(input);
		const b = await provider.scan(input);

		expect(a.items).toEqual(b.items);
		expect(a.rawText).toBe(b.rawText);
		expect(a.issues).toEqual(b.issues);
	});
});