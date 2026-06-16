import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, buildMenuSnapshot, extractSafetyJson, PROMPT_VERSION } from './prompt';
import type { LlmChatContext, LlmMenuItem } from './types';

const baseContext: LlmChatContext = {
	restaurantId: 'rest-1',
	restaurantName: 'Uma Karang',
	languageTag: 'en',
	dietaryPreferences: ['halal', 'vegetarian'],
	question: 'Is the nasi goreng halal?'
};

const sampleItem: LlmMenuItem = {
	name: 'Nasi Goreng',
	localName: 'Nasi Goreng Spesial',
	category: 'Main',
	description: 'Indonesian fried rice with egg and chicken',
	price: 85000,
	isAvailable: true,
	spiceLevel: 2,
	dietaryFlags: ['halal'],
	allergens: ['egg'],
	confidence: 'verified'
};

describe('buildMenuSnapshot', () => {
	it('renders item name, category, price and dietary flag', () => {
		const out = buildMenuSnapshot([sampleItem]);
		expect(out).toContain('[Main]');
		expect(out).toContain('Nasi Goreng');
		expect(out).toContain('85.000'); // Indonesian locale
		expect(out).toContain('halal');
	});

	it('includes localName in parentheses when present', () => {
		const out = buildMenuSnapshot([sampleItem]);
		expect(out).toContain('Nasi Goreng Spesial');
	});

	it('includes allergens', () => {
		const out = buildMenuSnapshot([sampleItem]);
		expect(out).toContain('allergens:egg');
	});

	it('includes spice level when > 0', () => {
		const out = buildMenuSnapshot([sampleItem]);
		expect(out).toContain('spice:2/5');
	});

	it('omits spice when level is 0', () => {
		const out = buildMenuSnapshot([{ ...sampleItem, spiceLevel: 0 }]);
		expect(out).not.toContain('spice:');
	});

	it('marks staff-confirm items with warning symbol', () => {
		const out = buildMenuSnapshot([{ ...sampleItem, confidence: 'staff-confirm' }]);
		expect(out).toContain('⚠[staff-confirm]');
	});

	it('marks needs-review items as unverified', () => {
		const out = buildMenuSnapshot([{ ...sampleItem, confidence: 'needs-review' }]);
		expect(out).toContain('[unverified]');
	});

	it('excludes unavailable items', () => {
		const out = buildMenuSnapshot([{ ...sampleItem, isAvailable: false }]);
		expect(out).not.toContain('Nasi Goreng');
		expect(out).toContain('unavailable');
	});

	it('returns no-data message for empty array', () => {
		const out = buildMenuSnapshot([]);
		expect(out).toContain('No menu data available');
	});
});

describe('buildSystemPrompt', () => {
	it('includes the restaurant name', () => {
		const prompt = buildSystemPrompt(baseContext);
		expect(prompt).toContain('Uma Karang');
	});

	it('includes the prompt version', () => {
		const prompt = buildSystemPrompt(baseContext);
		expect(prompt).toContain(PROMPT_VERSION);
	});

	it('includes the guest language tag', () => {
		const prompt = buildSystemPrompt(baseContext);
		expect(prompt).toContain('en');
	});

	it('lists dietary preferences', () => {
		const prompt = buildSystemPrompt(baseContext);
		expect(prompt).toContain('halal');
		expect(prompt).toContain('vegetarian');
	});

	it('shows no-preferences message when empty', () => {
		const prompt = buildSystemPrompt({ ...baseContext, dietaryPreferences: [] });
		expect(prompt).toContain('No dietary preferences specified');
	});

	it('embeds menu data when menuItems provided', () => {
		const prompt = buildSystemPrompt({ ...baseContext, menuItems: [sampleItem] });
		expect(prompt).toContain('MENU DATA');
		expect(prompt).toContain('Nasi Goreng');
	});

	it('shows no-menu fallback when menuItems is undefined', () => {
		const prompt = buildSystemPrompt({ ...baseContext, menuItems: undefined });
		expect(prompt).toContain('No menu data provided');
	});

	it('contains all mandatory guardrail rules', () => {
		const prompt = buildSystemPrompt(baseContext);
		expect(prompt).toContain('Do NOT invent');
		expect(prompt).toContain('escalate to staff');
		expect(prompt).toContain('needs-staff');
		expect(prompt).toContain('blocked');
	});
});

describe('extractSafetyJson', () => {
	it('extracts safety status and cleans the answer', () => {
		const raw = 'Nasi goreng is halal at Uma Karang.\n{"safety":"ok","suggest_fallback":false}';
		const result = extractSafetyJson(raw);

		expect(result.safety).toBe('ok');
		expect(result.suggestFallback).toBe(false);
		expect(result.cleaned).toBe('Nasi goreng is halal at Uma Karang.');
	});

	it('handles needs-staff with suggest_fallback true', () => {
		const raw =
			'Please ask our staff about allergen details.\n{"safety":"needs-staff","suggest_fallback":true}';
		const result = extractSafetyJson(raw);

		expect(result.safety).toBe('needs-staff');
		expect(result.suggestFallback).toBe(true);
	});

	it('falls back to low-confidence when no JSON is appended', () => {
		const raw = 'Some answer without the JSON footer.';
		const result = extractSafetyJson(raw);

		expect(result.safety).toBe('low-confidence');
		expect(result.cleaned).toBe(raw);
	});

	it('falls back to low-confidence when JSON is malformed', () => {
		const raw = 'Answer text.\n{bad json}';
		const result = extractSafetyJson(raw);

		expect(result.safety).toBe('low-confidence');
	});

	it('handles blocked status', () => {
		const raw =
			'I can only help with Uma Karang\'s menu.\n{"safety":"blocked","suggest_fallback":false}';
		const result = extractSafetyJson(raw);

		expect(result.safety).toBe('blocked');
		expect(result.suggestFallback).toBe(false);
	});
});
