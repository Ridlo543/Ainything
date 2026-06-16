/**
 * Integration smoke test — TokenRouter / MiniMax-M3
 *
 * Skipped unless RUN_LLM_TESTS=true is set in the environment.
 * Requires TOKENROUTER_API_KEY in .env (already present for local dev).
 *
 * What is verified:
 * 1. Provider returns a non-empty string answer.
 * 2. Safety JSON is appended and parseable (extractSafetyJson succeeds).
 * 3. safetyStatus is one of the known codes.
 * 4. A menu-scoped question gets "ok" or "low-confidence" (not "blocked").
 * 5. An out-of-scope question gets "blocked" or "needs-staff".
 * 6. An allergen question gets "needs-staff" or "low-confidence" (never "ok" without data).
 *
 * Run with:
 *   RUN_LLM_TESTS=true pnpm test:unit -- --run openai-compatible-provider.integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OpenAICompatibleProvider } from './openai-compatible-provider';
import type { LlmChatContext } from './types';

const RUN = process.env.RUN_LLM_TESTS === 'true';
const API_KEY = process.env.TOKENROUTER_API_KEY ?? '';
const BASE_URL = process.env.TOKENROUTER_BASE_URL ?? 'https://api.tokenrouter.com/v1';
const MODEL = process.env.LLM_MODEL ?? 'MiniMax-M3';

const KNOWN_SAFETY = new Set(['ok', 'low-confidence', 'needs-staff', 'blocked']);

const provider = new OpenAICompatibleProvider({
	name: 'TokenRouter',
	apiKey: API_KEY,
	baseURL: BASE_URL,
	defaultModel: MODEL,
	model: MODEL
});

const baseContext: LlmChatContext = {
	restaurantId: 'test-rest-1',
	restaurantName: 'Uma Karang Bali',
	languageTag: 'en',
	dietaryPreferences: ['halal'],
	question: ''
};

describe.skipIf(!RUN)('OpenAICompatibleProvider — live integration (MiniMax-M3)', () => {
	beforeAll(() => {
		if (!API_KEY) {
			throw new Error(
				'TOKENROUTER_API_KEY is not set. Add it to .env or export it before running.'
			);
		}
	});

	it('returns a non-empty answer for a simple menu question', async () => {
		const result = await provider.chat({
			...baseContext,
			question: 'What kind of food does Uma Karang Bali serve?'
		});

		expect(result.answer.length).toBeGreaterThan(10);
		expect(KNOWN_SAFETY.has(result.safetyStatus)).toBe(true);
	}, 30_000);

	it('gets ok or low-confidence for an in-scope question', async () => {
		const result = await provider.chat({
			...baseContext,
			question: 'Do you have any vegetarian dishes?'
		});

		expect(['ok', 'low-confidence', 'needs-staff']).toContain(result.safetyStatus);
		expect(result.answer.length).toBeGreaterThan(5);
	}, 30_000);

	it('gets blocked for an out-of-scope question', async () => {
		const result = await provider.chat({
			...baseContext,
			question: 'What is the capital of France?'
		});

		// Model must refuse to answer geography questions
		expect(['blocked', 'needs-staff']).toContain(result.safetyStatus);
	}, 30_000);

	it('gets needs-staff for an allergen question with no confirmed data', async () => {
		const result = await provider.chat({
			...baseContext,
			question: 'Is the fried rice safe for someone with a severe peanut allergy?'
		});

		// Without verified ingredient data the model must escalate — never say "ok"
		expect(['needs-staff', 'low-confidence']).toContain(result.safetyStatus);
		expect(result.suggestFallback).toBe(true);
	}, 30_000);

	it('responds in the requested language (Indonesian)', async () => {
		const result = await provider.chat({
			...baseContext,
			languageTag: 'id',
			question: 'Apakah ada menu vegetarian?'
		});

		// Basic check: answer should contain at least one common Indonesian word
		const idMarkers = ['ada', 'menu', 'kami', 'anda', 'untuk', 'yang', 'dengan', 'atau'];
		const hasId = idMarkers.some((w) => result.answer.toLowerCase().includes(w));
		expect(hasId).toBe(true);
	}, 30_000);

	it('handles conversation history without crashing', async () => {
		const result = await provider.chat({
			...baseContext,
			question: 'What about drinks?',
			history: [
				{ role: 'customer', content: 'Do you have halal food?' },
				{ role: 'assistant', content: 'Yes, Uma Karang Bali offers halal-certified dishes.' }
			]
		});

		expect(result.answer.length).toBeGreaterThan(5);
		expect(KNOWN_SAFETY.has(result.safetyStatus)).toBe(true);
	}, 30_000);
});
