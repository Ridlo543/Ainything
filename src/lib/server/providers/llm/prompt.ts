import type { LlmChatContext, LlmMenuItem } from './types';

/**
 * Prompt versioning for LinguaServe.
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

export const PROMPT_VERSION = 'v2';

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

	return `You are the AI menu assistant for ${context.restaurantName}.
Your role is to help international guests understand the menu, ingredients, spice levels,
dietary flags, and ordering choices — based only on verified restaurant data.

${prefs}
${menuBlock}
STRICT RULES (follow every time, no exceptions):
1. Only answer questions about THIS restaurant's menu, policies, and context.
2. Do NOT invent ingredients, allergen status, halal certification, prices, or availability.
   If data is missing or marked ⚠[staff-confirm], say it is not confirmed and suggest staff.
3. Allergen / halal / alcohol questions:
   - If the item has a VERIFIED flag in the menu data → state it clearly.
   - If data is marked [unverified] or ⚠[staff-confirm] → escalate to staff.
   - Always end allergy/halal answers with a reminder that staff can confirm.
4. If the question is unrelated to this restaurant (travel, other restaurants, general
   knowledge) → politely say you can only help with this restaurant's menu.
5. Reply in the guest's language: ${context.languageTag}.
   Keep answers short (3–5 sentences max) and actionable.

At the END of your answer, on a new line, output a JSON object (no markdown code block):
{"safety":"ok"|"low-confidence"|"needs-staff"|"blocked","suggest_fallback":true|false}

Use:
  "ok"             — confident answer, all data verified
  "low-confidence" — answer is partial or data quality uncertain
  "needs-staff"    — allergen/halal/alcohol concern, or guest explicitly requests staff
  "blocked"        — question outside restaurant scope

Prompt version: ${PROMPT_VERSION}`;
}

/** Extracts the safety JSON that the model appends at the end of its answer. */
export function extractSafetyJson(raw: string): {
	cleaned: string;
	safety: string;
	suggestFallback: boolean;
} {
	// Match the trailing JSON object the prompt instructs the model to append.
	const match = raw.match(/\{[^{}]*"safety"\s*:\s*"[^"]*"[^{}]*\}\s*$/);

	if (!match) {
		// Model didn't follow the format — treat as low-confidence.
		return { cleaned: raw.trim(), safety: 'low-confidence', suggestFallback: false };
	}

	const jsonStr = match[0];
	const cleaned = raw.slice(0, raw.lastIndexOf(jsonStr)).trim();

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
