import type { LlmProvider, LlmChatContext, LlmChatResult } from './types';

/**
 * Mock LLM provider for local development and tests.
 *
 * Returns a deterministic placeholder that communicates clearly to the guest that AI
 * is not yet connected, rather than silently returning empty or wrong data. The
 * safetyStatus is set to 'needs-staff' so the UI offers a staff fallback — exactly the
 * correct fallback behaviour when no AI answer is available.
 *
 * Phase 7 replaces this with real provider implementations.
 */
export class MockLlmProvider implements LlmProvider {
	async chat(context: LlmChatContext): Promise<LlmChatResult> {
		return {
			answer: [
				`Thank you for your question about ${context.outletName}.`,
				`Our AI assistant is not yet fully connected.`,
				`Please ask our staff for help — they will be happy to answer in your language.`
			].join(' '),
			safetyStatus: 'needs-staff',
			suggestFallback: true
		};
	}
}
