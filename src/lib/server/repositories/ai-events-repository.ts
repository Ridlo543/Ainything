import { query } from '$lib/server/db/postgres';
import { PROMPT_VERSION } from '$lib/server/providers/llm/prompt';

/**
 * Input for a single AI event row. Fields mirror the ai_events table in
 * db/migrations/0001_core_multi_tenant_schema.sql.
 *
 * All fields are optional except the three required tenant identifiers and
 * provider/model/event_type so callers can log partial events on error paths.
 */
export type AiEventInput = {
	organizationId: string;
	outletId: string;
	buyerSessionId?: string;
	provider: string;
	model: string;
	/** Matches PROMPT_VERSION — logged so regression tests can be scoped per version. */
	promptVersion?: string;
	/** 'chat' for normal turns; 'error' for provider failures; 'cap-exceeded' for daily cap. */
	eventType: 'chat' | 'error' | 'cap-exceeded';
	latencyMs?: number;
	inputTokens?: number;
	outputTokens?: number;
	/** 0–1 confidence proxy. For now: ok=1.0, low-confidence=0.5, needs-staff=0.3, blocked=0.0 */
	confidence?: number;
	retrievedRefs?: unknown[];
	safetyFlags?: string[];
	errorCode?: string;
};

const SAFETY_CONFIDENCE: Record<string, number> = {
	ok: 1.0,
	'low-confidence': 0.5,
	'needs-staff': 0.3,
	blocked: 0.0
};

export function safetyToConfidence(safetyStatus: string): number {
	return SAFETY_CONFIDENCE[safetyStatus] ?? 0.5;
}

/**
 * Writes a single row to ai_events. Fail-open: errors are logged but never
 * propagated — a logging failure must never break the guest's chat experience.
 */
export async function logAiEvent(input: AiEventInput): Promise<void> {
	try {
		await query(
			`
		INSERT INTO ai_events (
			organization_id,
			outlet_id,
			buyer_session_id,
				provider,
				model,
				prompt_version,
				event_type,
				latency_ms,
				input_tokens,
				output_tokens,
				confidence,
				retrieved_refs,
				safety_flags,
				error_code
			)
			VALUES (
				$1::uuid, $2::uuid, $3::uuid,
				$4, $5, $6, $7,
				$8, $9, $10, $11,
				$12::jsonb, $13, $14
			)
		`,
			[
			input.organizationId,
			input.outletId,
			input.buyerSessionId ?? null,
				input.provider,
				input.model,
				input.promptVersion ?? PROMPT_VERSION,
				input.eventType,
				input.latencyMs ?? null,
				input.inputTokens ?? null,
				input.outputTokens ?? null,
				input.confidence ?? null,
				JSON.stringify(input.retrievedRefs ?? []),
				input.safetyFlags ?? [],
				input.errorCode ?? null
			]
		);
	} catch (err) {
		// Fail-open: log the error but never propagate it.
		console.error('[ai-events] Failed to log AI event', err);
	}
}
