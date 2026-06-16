import type { PublicMenuBootstrap } from '$lib/domain/menu/types';
import { createChatMessageInputSchema } from '$lib/domain/session/schema';
import { persistChatTurn, getRecentHistory } from '$lib/server/repositories/chat-repository';
import { getLlmProvider } from '$lib/server/providers/llm/factory';
import type { LlmMenuItem } from '$lib/server/providers/llm/types';
import { logAiEvent, safetyToConfidence } from '$lib/server/repositories/ai-events-repository';

export type ChatTurnResult = {
	customerMessageId: string;
	assistantMessageId: string;
	answer: string;
	safetyStatus: string;
	suggestFallback: boolean;
};

/**
 * Maps bootstrap menu items to the slim LlmMenuItem snapshot.
 * Excludes unavailable items so the model never suggests sold-out dishes.
 * Caps at 80 items to avoid bloating the context window on large menus.
 */
function toMenuSnapshot(bootstrap: PublicMenuBootstrap): LlmMenuItem[] {
	return bootstrap.restaurant.menuItems
		.filter((item) => item.isAvailable)
		.slice(0, 80)
		.map((item) => ({
			name: item.name,
			localName: item.localName,
			category: item.category,
			description: item.description,
			price: item.price,
			isAvailable: item.isAvailable,
			spiceLevel: item.spiceLevel,
			dietaryFlags: item.dietaryFlags,
			allergens: item.allergens,
			confidence: item.confidence
		}));
}

/**
 * Handles a single chat turn from a guest.
 *
 * Responsibility chain:
 * 1. Validate input (Zod).
 * 2. Load the last ≤5 conversation turns for context (history).
 * 3. Build a slim menu snapshot from the bootstrap (available items only, max 80).
 * 4. Call the active LLM provider with restaurant-scoped context + menu + history.
 * 5. Persist the customer question and AI answer in the same DB transaction.
 * 6. Return the answer payload to the route.
 *
 * AI cost-cap enforcement is applied by the caller (the API route) before reaching
 * this service. Phase 7 expands step 4 with RAG retrieval and AI event logging.
 */
export async function handleChatTurn(
	bootstrap: PublicMenuBootstrap,
	rawInput: unknown
): Promise<ChatTurnResult> {
	const input = createChatMessageInputSchema.parse(rawInput);

	// Load recent conversation history for this session (max 5 turns = 10 messages).
	const history = await getRecentHistory(input.sessionId, 10);

	const provider = getLlmProvider();
	const menuItems = toMenuSnapshot(bootstrap);

	const llmResult = await provider.chat({
		restaurantId: bootstrap.table.restaurantId,
		restaurantName: bootstrap.restaurant.name,
		languageTag: input.languageTag,
		dietaryPreferences: [...new Set(bootstrap.restaurant.menuItems.flatMap((i) => i.dietaryFlags))],
		menuItems,
		question: input.content,
		history
	});

	// Log AI event (fail-open — never throws).
	void logAiEvent({
		organizationId: bootstrap.table.organizationId,
		restaurantId: bootstrap.table.restaurantId,
		sessionId: input.sessionId,
		provider: llmResult.provider ?? 'unknown',
		model: llmResult.model ?? 'unknown',
		eventType: 'chat',
		latencyMs: llmResult.latencyMs,
		inputTokens: llmResult.usage?.inputTokens,
		outputTokens: llmResult.usage?.outputTokens,
		confidence: safetyToConfidence(llmResult.safetyStatus),
		safetyFlags: [llmResult.safetyStatus]
	});

	const { customerMessage, assistantMessage } = await persistChatTurn({
		organizationId: bootstrap.table.organizationId,
		restaurantId: bootstrap.table.restaurantId,
		sessionId: input.sessionId,
		customerContent: input.content,
		assistantContent: llmResult.answer,
		assistantSafety: llmResult.safetyStatus
	});

	return {
		customerMessageId: customerMessage.id,
		assistantMessageId: assistantMessage.id,
		answer: llmResult.answer,
		safetyStatus: llmResult.safetyStatus,
		suggestFallback: llmResult.suggestFallback
	};
}
