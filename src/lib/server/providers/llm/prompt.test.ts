import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, extractSafetyJson, PROMPT_VERSION } from './prompt';
import type { LlmChatContext } from './types';

const baseContext: LlmChatContext = {
	restaurantId: 'rest-1',
	restaurantName: 'Uma Karang',
	languageTag: 'en',
	dietaryPreferences: ['halal', 'vegetarian'],
	question: 'Is the nasi goreng halal?'
};

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

	it('contains all mandatory guardrail rules', () => {
		const prompt = buildSystemPrompt(baseContext);
		// Verify critical guardrail keywords are present
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
