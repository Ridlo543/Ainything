import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import type { LlmProvider, LlmChatContext, LlmChatResult } from './types';
import type { ChatSafetyStatus } from '$lib/domain/session/schema';
import { buildSystemPrompt, extractSafetyJson, PROMPT_VERSION } from './prompt';

const KNOWN_SAFETY_STATUSES = new Set<ChatSafetyStatus>([
	'ok',
	'low-confidence',
	'needs-staff',
	'blocked'
]);

function toSafetyStatus(raw: string): ChatSafetyStatus {
	return KNOWN_SAFETY_STATUSES.has(raw as ChatSafetyStatus)
		? (raw as ChatSafetyStatus)
		: 'low-confidence';
}

type OpenAICompatibleProviderOptions = {
	/** Provider display name for logs. */
	name: string;
	apiKey: string;
	baseURL: string;
	/** Default model id when LLM_MODEL env is not set. */
	defaultModel: string;
	/** Resolved model id (from LLM_MODEL env or the default). */
	model: string;
};

/**
 * Provider implementation that works with any OpenAI-compatible API:
 * - TokenRouter (multi-provider proxy)
 * - Direct OpenAI API
 * - Any other API that accepts OpenAI chat-completion format
 *
 * Uses the Vercel AI SDK `@ai-sdk/openai-compatible` + `generateText` so streaming
 * can be added later without rewriting the adapter.
 */
export class OpenAICompatibleProvider implements LlmProvider {
	private readonly opts: OpenAICompatibleProviderOptions;

	constructor(opts: OpenAICompatibleProviderOptions) {
		this.opts = opts;
	}

	async chat(context: LlmChatContext): Promise<LlmChatResult> {
		const provider = createOpenAICompatible({
			name: this.opts.name,
			apiKey: this.opts.apiKey,
			baseURL: this.opts.baseURL
		});

		const systemPrompt = buildSystemPrompt(context);

		// Build message history (last ≤10 turns for context window efficiency).
		const historyMessages = (context.history ?? []).slice(-10).map((msg) => ({
			role: (msg.role === 'customer' ? 'user' : 'assistant') as 'user' | 'assistant',
			content: msg.content
		}));

		const start = Date.now();

		try {
			const { text, usage } = await generateText({
				model: provider(this.opts.model),
				system: systemPrompt,
				messages: [...historyMessages, { role: 'user' as const, content: context.question }],
				maxOutputTokens: 512,
				temperature: 0.3 // Low temp for factual menu answers
			});

			const latencyMs = Date.now() - start;
			const { cleaned, safety, suggestFallback } = extractSafetyJson(text);

			return {
				answer: cleaned,
				safetyStatus: toSafetyStatus(safety),
				suggestFallback,
				provider: this.opts.name,
				model: this.opts.model,
				latencyMs,
				usage: {
					inputTokens: usage?.inputTokens,
					outputTokens: usage?.outputTokens
				}
			};
		} catch (err) {
			const latencyMs = Date.now() - start;
			console.error(`[${this.opts.name}] LLM call failed (prompt ${PROMPT_VERSION})`, err);

			// Fail safely: tell the guest to ask staff.
			return {
				answer:
					'I was unable to process your question right now. Please ask our staff — they will be happy to help you.',
				safetyStatus: 'needs-staff',
				suggestFallback: true,
				provider: this.opts.name,
				model: this.opts.model,
				latencyMs
			};
		}
	}
}
