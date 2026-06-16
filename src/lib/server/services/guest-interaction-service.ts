import type { PublicMenuBootstrap } from '$lib/domain/menu/types';
import { createFallbackInputSchema, createFeedbackInputSchema } from '$lib/domain/session/schema';
import {
	createFallbackRequest,
	createFeedback
} from '$lib/server/repositories/public-menu-repository';

// ---------------------------------------------------------------------------
// Fallback request service
// ---------------------------------------------------------------------------

export type CreateFallbackResult = {
	fallbackId: string;
	status: string;
};

/**
 * Creates a staff fallback request for a table session.
 *
 * Tenant scope (organization/restaurant/table) is taken from the server-resolved
 * `bootstrap`; the service validates the guest-supplied payload with Zod and calls the
 * repository. The repository will set `app.public_session_id` inside the DB transaction
 * so the hardened RLS policy (migration 0004) can verify session ownership at the DB
 * layer.
 */
export async function createFallbackForTable(
	bootstrap: PublicMenuBootstrap,
	rawInput: unknown
): Promise<CreateFallbackResult> {
	const input = createFallbackInputSchema.parse(rawInput);

	const created = await createFallbackRequest({
		organizationId: bootstrap.table.organizationId,
		restaurantId: bootstrap.table.restaurantId,
		tableId: bootstrap.table.id,
		sessionId: input.sessionId,
		languageTag: input.languageTag,
		guestNeed: input.guestNeed,
		summary: input.summary,
		priority: input.priority
	});

	return {
		fallbackId: created.id,
		status: created.status
	};
}

// ---------------------------------------------------------------------------
// Feedback service
// ---------------------------------------------------------------------------

export type CreateFeedbackResult = {
	feedbackId: string;
};

/**
 * Persists a guest's quick feedback for a session.
 *
 * Tenant scope comes from the server-resolved `bootstrap`; the repository sets
 * `app.public_session_id` so the hardened RLS policy validates session ownership.
 */
export async function createFeedbackForSession(
	bootstrap: PublicMenuBootstrap,
	rawInput: unknown
): Promise<CreateFeedbackResult> {
	const input = createFeedbackInputSchema.parse(rawInput);

	const created = await createFeedback({
		organizationId: bootstrap.table.organizationId,
		restaurantId: bootstrap.table.restaurantId,
		sessionId: input.sessionId,
		helpful: input.helpful,
		issueType: input.issueType,
		comment: input.comment
	});

	return { feedbackId: created.id };
}
