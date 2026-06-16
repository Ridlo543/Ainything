import { anthropic } from '@ai-sdk/anthropic';
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

/**
 * Anthropic provider implementation using the native @ai-sdk/anthropic package.
 * Use when LLM_PROVIDER=anthropic and ANTHROPIC_API_KEY is set.
 *
 * Default model: claude-haiku-4-5 (fast + cheap for menu Q&A).
 * Override via LLM_MODEL env (e.g. claude-sonnet-4-5 for higher quality).
 */
export class AnthropicProvider implements LlmProvider {
	private readonly model: string;

	constructor(model: string) {
		this.model = model;
	}

	async chat(context: LlmChatContext): Promise<LlmChatResult> {
		const systemPrompt = buildSystemPrompt(context);

		const historyMessages = (context.history ?? []).slice(-10).map((msg) => ({
			role: (msg.role === 'customer' ? 'user' : 'assistant') as 'user' | 'assistant',
			content: msg.content
		}));

		const start = Date.now();

		try {
			const { text, usage } = await generateText({
				model: anthropic(this.model),
				system: systemPrompt,
				messages: [...historyMessages, { role: 'user' as const, content: context.question }],
				maxOutputTokens: 512,
				temperature: 0.3
			});

			const latencyMs = Date.now() - start;
			const { cleaned, safety, suggestFallback } = extractSafetyJson(text);

			return {
				answer: cleaned,
				safetyStatus: toSafetyStatus(safety),
				suggestFallback,
				provider: 'anthropic',
				model: this.model,
				latencyMs,
				usage: {
					inputTokens: usage?.inputTokens,
					outputTokens: usage?.outputTokens
				}
			};
		} catch (err) {
			const latencyMs = Date.now() - start;
			console.error(`[anthropic] LLM call failed (prompt ${PROMPT_VERSION})`, err);

			return {
				answer:
					'I was unable to process your question right now. Please ask our staff — they will be happy to help you.',
				safetyStatus: 'needs-staff',
				suggestFallback: true,
				provider: 'anthropic',
				model: this.model,
				latencyMs
			};
		}
	}
}
