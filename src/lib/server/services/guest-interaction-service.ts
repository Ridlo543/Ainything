import type { PublicCatalogBootstrap } from '$lib/domain/outlet/types';
import { createFallbackInputSchema } from '$lib/domain/fallback/schema';
import { createFeedbackInputSchema } from '$lib/domain/feedback/schema';
import {
	createFallbackRequest,
	createBuyerFeedback
} from '$lib/server/repositories/public-catalog-repository';
import { getRedisClient } from '$lib/server/cache/redis';
import { appEnv } from '$lib/server/config/env';

// ---------------------------------------------------------------------------
// Redis pub/sub helper
// ---------------------------------------------------------------------------

/**
 * Publishes a JSON payload to the `fallback:{outletId}` channel so that
 * connected SSE clients (staff inbox) receive near-real-time notifications.
 *
 * Failures are caught and logged — a Redis publish error must never break the
 * guest-facing fallback creation path.
 */
async function publishFallbackEvent(outletId: string, payload: unknown): Promise<void> {
	if (!appEnv.redisUrl) {
		return; // Redis not configured in this environment — skip silently
	}

	try {
		const redis = await getRedisClient();
		await redis.publish(`fallback:${outletId}`, JSON.stringify(payload));
	} catch (err) {
		console.error('[guest-interaction-service] Failed to publish fallback event', err);
	}
}

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
 * Tenant scope (organization/outlet/table) is taken from the server-resolved
 * `bootstrap`; the service validates the guest-supplied payload with Zod and calls the
 * repository. The repository will set `app.public_session_id` inside the DB transaction
 * so the hardened RLS policy can verify session ownership at the DB layer.
 */
export async function createFallbackForTable(
	bootstrap: PublicCatalogBootstrap,
	rawInput: unknown
): Promise<CreateFallbackResult> {
	const input = createFallbackInputSchema.parse(rawInput);

	const created = await createFallbackRequest({
		organizationId: bootstrap.table.organizationId,
		outletId: bootstrap.table.outletId,
		tableId: bootstrap.table.id,
		sessionId: input.sessionId,
		languageTag: input.languageTag,
		guestNeed: input.guestNeed,
		summary: input.summary,
		priority: input.priority
	});

	// Publish event for staff inbox SSE (fire-and-forget; failure is non-fatal)
	// Status is always 'new' on creation — the DB default.
	await publishFallbackEvent(bootstrap.table.outletId, {
		fallbackId: created.id,
		outletId: bootstrap.table.outletId,
		tableId: bootstrap.table.id,
		languageTag: input.languageTag,
		guestNeed: input.guestNeed,
		summary: input.summary,
		priority: input.priority,
		status: 'new'
	});

	return {
		fallbackId: created.id,
		status: 'new'
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
	bootstrap: PublicCatalogBootstrap,
	rawInput: unknown
): Promise<CreateFeedbackResult> {
	const input = createFeedbackInputSchema.parse(rawInput);

	const created = await createBuyerFeedback({
		organizationId: bootstrap.table.organizationId,
		outletId: bootstrap.table.outletId,
		sessionId: input.sessionId,
		helpful: input.helpful,
		issueType: input.issueType,
		comment: input.comment
	});

	return { feedbackId: created.id };
}
