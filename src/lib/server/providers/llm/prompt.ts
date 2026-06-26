import type { LlmChatContext, LlmMenuItem } from './types';

/**
 * Prompt versioning for Ainything.
 *
 * Bump PROMPT_VERSION whenever guardrail rules, answer format, or the menu snapshot
 * format changes so ai_events can scope regression testing by version.
 *
 * Guardrail rules (non-negotiable):
 * 1. Only answer questions about THIS restaurant's menu, ingredients, and context.
 * 2. Never invent ingredients, allergen status, halal certification, prices, or availability.
 * 3. For allergen/halal/alcohol/dietary questions where data is uncertain or missing,
 *    always escalate to staff.
 * 4. If the question is outside restaurant scope, decline politely.
 * 5. Reply in the guest's language. Keep answers short and actionable.
 */

export const PROMPT_VERSION = 'v3';

/**
 * Serialises menu items into a compact plain-text block for the system prompt.
 * Keeps tokens low: one line per item, pipe-separated fields, omitting empty values.
 *
 * Format:
 *   [Category] Name (LocalName) | IDR price | spice:N | flags | allergens | confidence
 *
 * Items with confidence=staff-confirm get a ⚠ marker so the model knows to hedge.
 * Unavailable items are omitted entirely — the model must not suggest them.
 */
export function buildMenuSnapshot(items: LlmMenuItem[]): string {
	if (items.length === 0) return '(No menu data available — defer all menu questions to staff.)';

	const available = items.filter((i) => i.isAvailable);
	if (available.length === 0)
		return "(All items are currently unavailable — ask staff for today's availability.)";

	const lines = available.map((item) => {
		const parts: string[] = [];

		const nameStr = item.localName ? `${item.name} (${item.localName})` : item.name;
		parts.push(`[${item.category}] ${nameStr}`);
		parts.push(`IDR ${item.price.toLocaleString('id-ID')}`);

		if (item.spiceLevel > 0) parts.push(`spice:${item.spiceLevel}/5`);
		if (item.dietaryFlags.length > 0) parts.push(item.dietaryFlags.join(','));
		if (item.allergens.length > 0) parts.push(`allergens:${item.allergens.join(',')}`);

		const confidenceTag =
			item.confidence === 'verified'
				? ''
				: item.confidence === 'needs-review'
					? ' [unverified]'
					: ' ⚠[staff-confirm]';

		return parts.join(' | ') + confidenceTag;
	});

	return lines.join('\n');
}

/** Builds the system prompt for a single chat turn. */
export function buildSystemPrompt(context: LlmChatContext): string {
	const prefs =
		context.dietaryPreferences.length > 0
			? `Guest dietary preferences: ${context.dietaryPreferences.join(', ')}.`
			: 'No dietary preferences specified.';

	const menuBlock =
		context.menuItems !== undefined
			? `\nMENU DATA (authoritative — use ONLY this data, do not invent anything):\n${buildMenuSnapshot(context.menuItems)}\n`
			: '\n(No menu data provided — for specific item questions, tell the guest you cannot confirm details and suggest asking staff.)\n';

	return `You are the AI menu assistant for ${context.outletName}.
Your role is to help international guests understand the menu, ingredients, spice levels,
dietary flags, and ordering choices — based ONLY on the verified restaurant data below.

${prefs}
${menuBlock}
STRICT RULES — follow every time without exception:

1. SCOPE: Only answer questions directly about THIS restaurant's menu items, ingredients,
   prices, availability, spice level, dietary flags, and policies.
   ANY question about travel, other restaurants, general cooking, geography, history,
   entertainment, or topics not in the menu data → MUST use safety "blocked".

2. NO INVENTION: If an item is NOT listed in the MENU DATA above, say it is not on the
   current menu and use safety "low-confidence". NEVER guess a price or ingredient.
   If a field is missing from the data, say the data is not confirmed.

3. ALLERGEN / HALAL / ALCOHOL rules:
   - Item has VERIFIED flag in menu data → state it clearly, safety "ok".
   - Item is marked ⚠[staff-confirm] or [unverified] → use "needs-staff", suggest staff.
   - Item has the queried allergen listed → use "needs-staff", never say "safe".
   - Guest asks about certification (e.g. MUI halal cert) not in data → "needs-staff".
   - Always end allergen/halal answers reminding guest that staff can confirm.

4. LANGUAGE: Reply in the guest's language: ${context.languageTag}.
   Keep answers short (3–5 sentences max) and actionable.

5. SAFETY JSON — at the END of your answer, on a new line, output exactly this JSON
   (no markdown code block, no extra text after it):
   {"safety":"ok"|"low-confidence"|"needs-staff"|"blocked","suggest_fallback":true|false}

   "ok"             → confident, all data verified, no safety risk
   "low-confidence" → partial data or uncertain quality
   "needs-staff"    → allergen/halal/alcohol concern, missing certification, or guest asks
   "blocked"        → question is outside this restaurant's menu scope

Prompt version: ${PROMPT_VERSION}`;
}

/**
 * Strips common LLM reasoning/thinking tags from raw output.
 *
 * Many models emit internal chain-of-thought wrapped in special tags:
 *   <think>...</think>   — OpenAI o1, MiniMax, DeepSeek R1
 *   <reasoning>...</reasoning>
 *   [thinking]...[/thinking]
 *   [think]...[/think]
 *
 * These tags and their contents are removed so they never reach the guest or
 * interfere with safety-JSON extraction and forbidden-content checks.
 */
export function stripReasoningTags(text: string): string {
	return text
		.replace(/<think>[\s\S]*?<\/think>/gi, '')
		.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
		.replace(/\[thinking\][\s\S]*?\[\/thinking\]/gi, '')
		.replace(/\[think\][\s\S]*?\[\/think\]/gi, '')
		.trim();
}

/** Extracts the safety JSON that the model appends at the end of its answer. */
export function extractSafetyJson(raw: string): {
	cleaned: string;
	safety: string;
	suggestFallback: boolean;
} {
	// Strip reasoning tags before anything else so they don't appear in the
	// cleaned answer or interfere with safety-JSON matching.
	const stripped = stripReasoningTags(raw);

	// Match the trailing JSON object the prompt instructs the model to append.
	const match = stripped.match(/\{[^{}]*"safety"\s*:\s*"[^"]*"[^{}]*\}\s*$/);

	if (!match) {
		// Model didn't follow the format — treat as low-confidence.
		return { cleaned: stripped, safety: 'low-confidence', suggestFallback: false };
	}

	const jsonStr = match[0];
	const cleaned = stripped.slice(0, stripped.lastIndexOf(jsonStr)).trim();

	try {
		const parsed = JSON.parse(jsonStr) as { safety?: string; suggest_fallback?: boolean };
		return {
			cleaned,
			safety: parsed.safety ?? 'low-confidence',
			suggestFallback: parsed.suggest_fallback ?? false
		};
	} catch {
		return { cleaned, safety: 'low-confidence', suggestFallback: false };
	}
}
