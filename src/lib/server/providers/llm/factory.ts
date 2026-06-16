import { appEnv } from '$lib/server/config/env';
import { MockLlmProvider } from './mock-provider';
import type { LlmProvider } from './types';

/**
 * Returns the active LLM provider.
 *
 * Reads `LLM_PROVIDER` from env (default 'mock'). Phase 7 adds real provider cases.
 * The factory is called at request time so the env can be changed per-environment
 * without rebuilding the app.
 */
export function getLlmProvider(): LlmProvider {
	const provider = appEnv.llmProvider ?? 'mock';

	switch (provider) {
		case 'mock':
			return new MockLlmProvider();
		default:
			console.warn(`[llm-factory] Unknown LLM_PROVIDER "${provider}", falling back to mock.`);
			return new MockLlmProvider();
	}
}
