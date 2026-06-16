import type { PublicMenuBootstrap } from '$lib/domain/menu/types';
import { createChatMessageInputSchema } from '$lib/domain/session/schema';
import { persistChatTurn } from '$lib/server/repositories/chat-repository';
import { getLlmProvider } from '$lib/server/providers/llm/factory';

export type ChatTurnResult = {
	customerMessageId: string;
	assistantMessageId: string;
	answer: string;
	safetyStatus: string;
	suggestFallback: boolean;
};

/**
 * Handles a single chat turn from a guest.
 *
 * Responsibility chain:
 * 1. Validate input (Zod).
 * 2. Call the active LLM provider with restaurant-scoped context.
 * 3. Persist the customer question and AI answer in the same DB transaction.
 * 4. Return the answer payload to the route.
 *
 * AI cost-cap enforcement is applied by the caller (the API route) before reaching
 * this service, so this service can remain focused on the chat turn.
 *
 * In Phase 7, step 2 will be expanded with retrieval (RAG), prompt versioning, and
 * AI event logging.
 */
export async function handleChatTurn(
	bootstrap: PublicMenuBootstrap,
	rawInput: unknown
): Promise<ChatTurnResult> {
	const input = createChatMessageInputSchema.parse(rawInput);

	// Call the LLM provider (mock in dev; real in production once LLM_PROVIDER is set).
	const provider = getLlmProvider();
	const llmResult = await provider.chat({
		restaurantId: bootstrap.table.restaurantId,
		restaurantName: bootstrap.restaurant.name,
		languageTag: input.languageTag,
		dietaryPreferences: bootstrap.restaurant.menuItems.flatMap((item) => item.dietaryFlags),
		question: input.content
	});

	// Persist both sides of the turn.
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
