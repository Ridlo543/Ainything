import type { ChatSafetyStatus } from '$lib/domain/session/schema';

/**
 * Minimal context passed to the LLM adapter for a single chat turn.
 * All fields come from server-side resolved data (restaurant menu, session language,
 * guest preferences). The adapter must never receive raw user-supplied tenant ids.
 */
export type LlmChatContext = {
	restaurantId: string;
	restaurantName: string;
	languageTag: string;
	/** Guest dietary preferences from the session. */
	dietaryPreferences: string[];
	/** The guest's current question (already validated and trimmed). */
	question: string;
	/** Optional last N messages for conversation continuity (max 10 recommended). */
	history?: Array<{ role: 'customer' | 'assistant'; content: string }>;
};

export type LlmChatResult = {
	/** The answer text to show the guest. */
	answer: string;
	/**
	 * Confidence/safety classification:
	 * - ok             Answer is confident and within scope.
	 * - low-confidence Answer may be partially correct; show a soft warning.
	 * - needs-staff    High-risk question (allergen/halal/dietary); escalate to staff.
	 * - blocked        Out of scope; politely decline.
	 */
	safetyStatus: ChatSafetyStatus;
	/** True when the adapter recommends proactively offering a staff fallback. */
	suggestFallback: boolean;
};

/**
 * LLM provider adapter interface. Every provider (OpenAI, Anthropic, Gemini, local
 * model) must implement this interface. The chat service depends only on this contract.
 *
 * Phase 7 will add prompt versioning, retrieval (RAG), and AI event logging to the
 * implementations.
 */
export interface LlmProvider {
	chat(context: LlmChatContext): Promise<LlmChatResult>;
}
