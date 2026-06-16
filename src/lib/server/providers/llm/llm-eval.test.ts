/**
 * AI Evaluation Suite — live run against TokenRouter / MiniMax-M3
 *
 * Skipped unless RUN_LLM_TESTS=true (set in .env or shell).
 *
 * Run individually:
 *   RUN_LLM_TESTS=true pnpm test:unit -- --run llm-eval --reporter=verbose
 *
 * Each fixture defines a realistic guest question and asserts on:
 *   - safetyStatus is within the expected set
 *   - suggestFallback is true when expectFallback is set
 *   - answer does not contain forbidden content
 *   - answer is a non-empty string
 *
 * Failures here indicate either:
 *   a) Prompt regression — guardrails not working
 *   b) Model behaviour change — reassess expected values
 *   c) Fixture is too strict — relax expected set with justification
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OpenAICompatibleProvider } from './openai-compatible-provider';
import { ALL_EVAL_FIXTURES, type EvalFixture } from './eval-fixtures';

const RUN = process.env.RUN_LLM_TESTS === 'true';
const API_KEY = process.env.TOKENROUTER_API_KEY ?? '';
const BASE_URL = process.env.TOKENROUTER_BASE_URL ?? 'https://api.tokenrouter.com/v1';
const MODEL = process.env.LLM_MODEL ?? 'MiniMax-M3';

const provider = new OpenAICompatibleProvider({
	name: 'TokenRouter',
	apiKey: API_KEY,
	baseURL: BASE_URL,
	defaultModel: MODEL,
	model: MODEL
});

function runFixture(fixture: EvalFixture) {
	it(
		`[${fixture.id}] ${fixture.description}`,
		async () => {
			const result = await provider.chat(fixture.context);

			// 1. Answer must be non-empty
			expect(result.answer.length, 'answer should be non-empty').toBeGreaterThan(5);

			// 2. Safety must be in expected set
			expect(
				fixture.expectedSafety,
				`safety "${result.safetyStatus}" not in expected [${fixture.expectedSafety.join(', ')}]`
			).toContain(result.safetyStatus);

			// 3. suggestFallback must be true when required
			if (fixture.expectFallback) {
				expect(result.suggestFallback, 'suggestFallback should be true').toBe(true);
			}

			// 4. Forbidden content must not appear
			if (fixture.forbiddenContent) {
				const lower = result.answer.toLowerCase();
				for (const forbidden of fixture.forbiddenContent) {
					expect(
						lower,
						`answer must not contain "${forbidden}"`
					).not.toContain(forbidden.toLowerCase());
				}
			}
		},
		60_000
	);
}
describe.skipIf(!RUN)('LLM Eval — Halal / dietary guardrails', () => {
	beforeAll(() => {
		if (!API_KEY) throw new Error('TOKENROUTER_API_KEY not set');
	});

	const fixtures = ALL_EVAL_FIXTURES.filter((f) => f.category === 'halal');
	for (const f of fixtures) runFixture(f);
});

describe.skipIf(!RUN)('LLM Eval — Allergen safety guardrails', () => {
	beforeAll(() => {
		if (!API_KEY) throw new Error('TOKENROUTER_API_KEY not set');
	});

	const fixtures = ALL_EVAL_FIXTURES.filter((f) => f.category === 'allergen');
	for (const f of fixtures) runFixture(f);
});

describe.skipIf(!RUN)('LLM Eval — Spice level answers', () => {
	beforeAll(() => {
		if (!API_KEY) throw new Error('TOKENROUTER_API_KEY not set');
	});

	const fixtures = ALL_EVAL_FIXTURES.filter((f) => f.category === 'spice');
	for (const f of fixtures) runFixture(f);
});

describe.skipIf(!RUN)('LLM Eval — Price and availability', () => {
	beforeAll(() => {
		if (!API_KEY) throw new Error('TOKENROUTER_API_KEY not set');
	});

	const fixtures = ALL_EVAL_FIXTURES.filter((f) => f.category === 'price');
	for (const f of fixtures) runFixture(f);
});

describe.skipIf(!RUN)('LLM Eval — Out-of-scope guardrails', () => {
	beforeAll(() => {
		if (!API_KEY) throw new Error('TOKENROUTER_API_KEY not set');
	});

	const fixtures = ALL_EVAL_FIXTURES.filter((f) => f.category === 'out-of-scope');
	for (const f of fixtures) runFixture(f);
});

describe.skipIf(!RUN)('LLM Eval — Language compliance', () => {
	beforeAll(() => {
		if (!API_KEY) throw new Error('TOKENROUTER_API_KEY not set');
	});

	const fixtures = ALL_EVAL_FIXTURES.filter((f) => f.category === 'language');
	for (const f of fixtures) runFixture(f);
});
