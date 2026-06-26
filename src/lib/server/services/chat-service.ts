import type { PublicMenuBootstrap } from '$lib/domain/menu/types';
import type { PublicCatalogBootstrap } from '$lib/domain/outlet/types';
import { createChatMessageInputSchema } from '$lib/domain/ai/schema';
import { persistChatTurn, getRecentHistory } from '$lib/server/repositories/chat-repository';
import { getLlmProvider } from '$lib/server/providers/llm/factory';
import type { LlmMenuItem } from '$lib/server/providers/llm/types';
import { logAiEvent, safetyToConfidence } from '$lib/server/repositories/ai-events-repository';
import { retrieveMenuContext } from '$lib/server/services/retrieval-service';
import { appEnv } from '$lib/server/config/env';

export type ChatTurnResult = {
	customerMessageId: string;
	assistantMessageId: string;
	answer: string;
	safetyStatus: string;
	suggestFallback: boolean;
};

/**
 * Maps MenuItem objects to the slim LlmMenuItem snapshot.
 * Excludes unavailable items so the model never suggests sold-out dishes.
 */
function toLlmMenuItems(items: PublicMenuBootstrap['restaurant']['menuItems']): LlmMenuItem[] {
	return items
		.filter((item) => item.isAvailable)
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
 * Legacy fallback: maps the full bootstrap menu to a slim LlmMenuItem snapshot.
 * Caps at 80 items to avoid bloating the context window on large menus.
 * Used when the retrieval service fails or is unavailable.
 */
function toMenuSnapshot(bootstrap: PublicMenuBootstrap): LlmMenuItem[] {
	return toLlmMenuItems(bootstrap.restaurant.menuItems).slice(0, 80);
}

/**
 * Maps MenuItem[] from retrieval service to the slim LlmMenuItem snapshot.
 */
function retrievalItemsToLlmItems(
	items: Array<{
		name: string;
		localName?: string;
		category: string;
		description: string;
		price: number;
		isAvailable: boolean;
		spiceLevel: number;
		dietaryFlags: string[];
		allergens: string[];
		confidence: string;
	}>
): LlmMenuItem[] {
	return items
		.filter((item) => item.isAvailable)
		.map((item) => ({
			name: item.name,
			localName: item.localName,
			category: item.category,
			description: item.description,
			price: item.price,
			isAvailable: item.isAvailable,
			spiceLevel: item.spiceLevel as LlmMenuItem['spiceLevel'],
			dietaryFlags: item.dietaryFlags,
			allergens: item.allergens,
			confidence: item.confidence as LlmMenuItem['confidence']
		}));
}

/**
 * Handles a single chat turn from a guest.
 *
 * Responsibility chain:
 * 1. Validate input (Zod).
 * 2. Load the last ≤5 conversation turns for context (history).
 * 3. Build menu context using the retrieval service (structured + optional semantic).
 *    Falls back to the legacy toMenuSnapshot if retrieval fails.
 * 4. Call the active LLM provider with restaurant-scoped context + menu + history.
 * 5. Persist the customer question and AI answer in the same DB transaction.
 * 6. Return the answer payload to the route.
 *
 * AI cost-cap enforcement is applied by the caller (the API route) before reaching
 * this service.
 */
export async function handleChatTurn(
	bootstrap: PublicMenuBootstrap,
	rawInput: unknown
): Promise<ChatTurnResult> {
	const input = createChatMessageInputSchema.parse(rawInput);

	// Load recent conversation history for this session (max 5 turns = 10 messages).
	const history = await getRecentHistory(input.sessionId, bootstrap.table.outletId, 10);

	const provider = getLlmProvider();

	// Build menu context via retrieval service (structured + optional semantic search).
	// Falls back to the legacy toMenuSnapshot if retrieval fails.
	let menuItems: LlmMenuItem[];

	try {
		const embeddingEnabled = appEnv.embeddingEnabled;

	const result = await retrieveMenuContext({
			outletId: bootstrap.table.outletId,
			query: input.content,
			preferences: {
				dietaryFlags: input.dietaryPreferences as
					| import('$lib/domain/menu/types').DietaryFlag[]
					| undefined,
				allergenExcludes: undefined
			},
			embeddingEnabled
		});

		menuItems = retrievalItemsToLlmItems(result.items);
	} catch (err) {
		console.error('[chat-service] Retrieval service failed, falling back to snapshot:', err);
		menuItems = toMenuSnapshot(bootstrap);
	}

	// Ensure we always have some menu data — if retrieval returned nothing,
	// fall back to the bootstrap snapshot.
	if (menuItems.length === 0) {
		menuItems = toMenuSnapshot(bootstrap);
	}

	const llmResult = await provider.chat({
		outletId: bootstrap.table.outletId,
		outletName: bootstrap.restaurant.name,
		languageTag: input.languageTag,
		dietaryPreferences: input.dietaryPreferences,
		menuItems,
		question: input.content,
		history
	});

	// Log AI event (fail-open — never throws).
	void logAiEvent({
		organizationId: bootstrap.table.organizationId,
		outletId: bootstrap.table.outletId,
		buyerSessionId: input.sessionId,
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
		outletId: bootstrap.table.outletId,
		buyerSessionId: input.sessionId,
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

// ---------------------------------------------------------------------------
// Outlet/catalog-aware chat turn (new outlets schema, migration 0022+)
// ---------------------------------------------------------------------------

/**
 * Maps Product objects from the new outlets schema to the slim LlmMenuItem snapshot.
 * Product uses `section` (category name string) instead of `category`.
 * `spiceLevel` is not on Product (only on legacy MenuItem) — default to 0.
 */
function productsToLlmItems(
	products: import('$lib/domain/outlet/types').Product[]
): LlmMenuItem[] {
	return products
		.filter((p) => p.isAvailable)
		.map((p) => ({
			name: p.name,
			localName: p.localName,
			category: p.section,
			description: p.description,
			price: p.price,
			isAvailable: p.isAvailable,
			spiceLevel: 0 as LlmMenuItem['spiceLevel'],
			dietaryFlags: p.dietaryFlags as string[],
			allergens: p.allergens as string[],
			confidence: p.confidence
		}));
}

/**
 * Handles a single chat turn from a buyer on the new outlets/catalog schema.
 *
 * Mirrors handleChatTurn but uses:
 *  - `bootstrap.table.outletId` instead of `bootstrap.table.restaurantId`
 *  - `bootstrap.outlet.products` for the fallback product snapshot
 *  - Product type (section, no spiceLevel) instead of MenuItem
 *
 * The retrieval and LLM layers are shared — only the bootstrap mapping differs.
 */
export async function handleCatalogChatTurn(
	bootstrap: PublicCatalogBootstrap,
	rawInput: unknown
): Promise<ChatTurnResult> {
	const input = createChatMessageInputSchema.parse(rawInput);

	const history = await getRecentHistory(input.sessionId, bootstrap.table.outletId, 10);

	const provider = getLlmProvider();

	let menuItems: LlmMenuItem[];

	try {
		const embeddingEnabled = appEnv.embeddingEnabled;

		const result = await retrieveMenuContext({
			outletId: bootstrap.table.outletId,
			query: input.content,
			preferences: {
				dietaryFlags: input.dietaryPreferences as
					| import('$lib/domain/menu/types').DietaryFlag[]
					| undefined,
				allergenExcludes: undefined
			},
			embeddingEnabled
		});

		menuItems = retrievalItemsToLlmItems(result.items);
	} catch (err) {
		console.error('[chat-service] Retrieval service failed, falling back to catalog snapshot:', err);
		menuItems = productsToLlmItems(bootstrap.outlet.products).slice(0, 80);
	}

	if (menuItems.length === 0) {
		menuItems = productsToLlmItems(bootstrap.outlet.products).slice(0, 80);
	}

	const llmResult = await provider.chat({
		outletId: bootstrap.table.outletId,
		outletName: bootstrap.outlet.name,
		languageTag: input.languageTag,
		dietaryPreferences: input.dietaryPreferences,
		menuItems,
		question: input.content,
		history
	});

	void logAiEvent({
		organizationId: bootstrap.table.organizationId,
		outletId: bootstrap.table.outletId,
		buyerSessionId: input.sessionId,
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
		outletId: bootstrap.table.outletId,
		buyerSessionId: input.sessionId,
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
