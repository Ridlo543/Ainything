import type { LlmChatContext } from './types';

/**
 * Prompt versioning for LinguaServe.
 *
 * Version is embedded in the system prompt string so it is captured in ai_events logs
 * (Phase 7 will read it from the LLM call context). Bump the version whenever the
 * guardrail rules or answer format changes so regression testing can be scoped.
 *
 * Guardrail rules (non-negotiable — must be present in every version):
 * 1. Only answer questions about THIS restaurant's menu, ingredients, and context.
 * 2. Never invent ingredients, allergen status, halal certification, prices, or
 *    availability.
 * 3. For allergen/halal/alcohol/dietary questions where data is uncertain or missing,
 *    always escalate to staff and set needs_staff_confirmation=true.
 * 4. If the question is completely outside restaurant scope, decline politely.
 * 5. Reply in the guest's language (languageTag). Keep answers short and actionable.
 */

export const PROMPT_VERSION = 'v1';

/** Builds the system prompt for a single chat turn. */
export function buildSystemPrompt(context: LlmChatContext): string {
	const prefs =
		context.dietaryPreferences.length > 0
			? `Guest dietary preferences: ${context.dietaryPreferences.join(', ')}.`
			: 'No dietary preferences specified.';

	return `You are the AI menu assistant for ${context.restaurantName}.
Your role is to help international guests understand the menu, ingredients, spice levels,
dietary flags, and ordering choices — based only on verified restaurant data.

${prefs}

STRICT RULES (follow every time, no exceptions):
1. Only answer questions about THIS restaurant's menu, policies, and context.
2. Do NOT invent ingredients, allergen status, halal certification, prices, or availability.
   If data is missing, say it is not confirmed and suggest the guest ask staff.
3. Allergen / halal / alcohol questions:
   - If the item has a VERIFIED flag → state it clearly.
   - If data is UNCERTAIN or the item is not in the menu → escalate to staff.
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
