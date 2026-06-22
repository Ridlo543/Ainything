import type { ChatSafetyStatus } from '$lib/domain/ai/types';

/**
 * Slim menu item snapshot passed to the LLM. Contains only what the model needs —
 * no image URLs, IDs, or internal flags that could confuse the model or bloat tokens.
 */
export type LlmMenuItem = {
	name: string;
	localName?: string;
	category: string;
	description: string;
	/** Price in IDR. */
	price: number;
	isAvailable: boolean;
	spiceLevel: number;
	dietaryFlags: string[];
	allergens: string[];
	confidence: 'verified' | 'needs-review' | 'staff-confirm';
};

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
	/**
	 * Published menu items available at this restaurant.
	 * Unavailable items are excluded; the model must not mention sold-out items
	 * as orderable.
	 */
	menuItems?: LlmMenuItem[];
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
	/** Provider name (e.g. 'TokenRouter', 'OpenAI', 'anthropic'). Used for ai_events. */
	provider?: string;
	/** Model id used for this call. Used for ai_events. */
	model?: string;
	/** Wall-clock latency in ms for the LLM call. Used for ai_events. */
	latencyMs?: number;
	/** Token counts from the LLM response, if available. */
	usage?: { inputTokens?: number; outputTokens?: number };
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

	/**
	 * Generates embeddings for the given texts.
	 *
	 * Returns an array of embedding vectors (one per input text) or null if the
	 * provider does not support embeddings (e.g. Anthropic). Optional so mock
	 * and unsupported providers can skip implementation.
	 *
	 * Used by the embedding worker for RAG — never called in the tourist hot path.
	 */
	embed?(texts: string[], model?: string): Promise<number[][] | null>;
}
