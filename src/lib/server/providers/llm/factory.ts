import { appEnv } from '$lib/server/config/env';
import { MockLlmProvider } from './mock-provider';
import { OpenAICompatibleProvider } from './openai-compatible-provider';
import { AnthropicProvider } from './anthropic-provider';
import type { LlmProvider } from './types';

/**
 * Default model ids per provider when LLM_MODEL env is not set.
 *
 * TokenRouter free tier: MiniMax-M3 (good enough for menu Q&A, no cost for testing).
 * OpenAI direct: gpt-4o-mini (cheap, fast, high quality for structured answers).
 * Anthropic direct: claude-haiku-4-5 (cheapest Anthropic model, still excellent).
 */
const DEFAULT_MODELS: Record<string, string> = {
	tokenrouter: 'MiniMax-M3',
	openai: 'gpt-4o-mini',
	anthropic: 'claude-haiku-4-5'
};

/**
 * Returns the active LLM provider singleton based on LLM_PROVIDER env.
 *
 * Supported values:
 *   'mock'        — No API key needed. Placeholder that offers staff fallback.
 *   'tokenrouter' — OpenAI-compatible proxy (TOKENROUTER_API_KEY required).
 *                   Supports many models including free-tier ones for testing.
 *   'openai'      — Direct OpenAI API (OPENAI_API_KEY required).
 *   'anthropic'   — Direct Anthropic API (ANTHROPIC_API_KEY required).
 *
 * Adding a new provider: add a case here + a new *-provider.ts file that implements
 * LlmProvider. No service or route files need to change.
 */
export function getLlmProvider(): LlmProvider {
	const providerName = appEnv.llmProvider;
	const model = appEnv.llmModel ?? DEFAULT_MODELS[providerName] ?? 'unknown';

	switch (providerName) {
		case 'tokenrouter': {
			const apiKey = appEnv.tokenrouterApiKey;

			if (!apiKey) {
				console.error('[llm-factory] TOKENROUTER_API_KEY is not set — falling back to mock.');
				return new MockLlmProvider();
			}

			return new OpenAICompatibleProvider({
				name: 'TokenRouter',
				apiKey,
				baseURL: appEnv.tokenrouterBaseUrl,
				defaultModel: DEFAULT_MODELS.tokenrouter,
				model
			});
		}

		case 'openai': {
			const apiKey = appEnv.openaiApiKey;

			if (!apiKey) {
				console.error('[llm-factory] OPENAI_API_KEY is not set — falling back to mock.');
				return new MockLlmProvider();
			}

			return new OpenAICompatibleProvider({
				name: 'OpenAI',
				apiKey,
				baseURL: 'https://api.openai.com/v1',
				defaultModel: DEFAULT_MODELS.openai,
				model
			});
		}

		case 'anthropic': {
			const apiKey = appEnv.anthropicApiKey;

			if (!apiKey) {
				console.error('[llm-factory] ANTHROPIC_API_KEY is not set — falling back to mock.');
				return new MockLlmProvider();
			}

			// Set the key as env variable because @ai-sdk/anthropic reads process.env.
			process.env.ANTHROPIC_API_KEY = apiKey;
			return new AnthropicProvider(model);
		}

		case 'mock':
			return new MockLlmProvider();

		default:
			console.warn(`[llm-factory] Unknown LLM_PROVIDER "${providerName}" — falling back to mock.`);
			return new MockLlmProvider();
	}
}
