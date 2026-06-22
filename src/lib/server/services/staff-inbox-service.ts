/**
 * Staff inbox service — business logic for listing and transitioning
 * fallback requests.
 *
 * Responsibilities:
 * - Validate all inputs with Zod before touching the DB.
 * - Verify membership before allowing reads or writes (belt-and-suspenders on
 *   top of RLS, matching the pattern used in menu-admin-service.ts).
 * - Enforce allowed status transitions (new → in_progress → resolved).
 * - Delegate persistence to staff-inbox-repository.
 *
 * The service never imports SvelteKit or route-level types — it is pure domain
 * logic that can be unit-tested without a running server.
 */

import type { StaffRequest } from '$lib/domain/fallback/types';
import { listRequestsInputSchema, transitionStatusInputSchema } from '$lib/domain/fallback/schema';
import { ALLOWED_TRANSITIONS } from '$lib/domain/fallback/policy';
import {
	listFallbackRequests,
	updateFallbackStatus
} from '$lib/server/repositories/staff-inbox-repository';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class StaffInboxAuthorizationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'StaffInboxAuthorizationError';
	}
}

export class StaffInboxTransitionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'StaffInboxTransitionError';
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all fallback requests the staff member is allowed to see.
 *
 * The `restaurantIds` array comes from the server-resolved TenantContext
 * (memberships table) — it is NOT trusted from the client.
 */
export async function listRequests(
	userId: string,
	organizationId: string,
	restaurantIds: string[]
): Promise<StaffRequest[]> {
	const parsed = listRequestsInputSchema.safeParse({ userId, organizationId, restaurantIds });

	if (!parsed.success) {
		throw new StaffInboxAuthorizationError(
			`Invalid list input: ${parsed.error.flatten().fieldErrors}`
		);
	}

	return listFallbackRequests(parsed.data.restaurantIds);
}

/**
 * Transitions a fallback request to a new status.
 *
 * Validates:
 * 1. Input shape (Zod)
 * 2. The restaurantId is in the staff member's scoped restaurant list
 * 3. The status transition is allowed by the workflow
 *
 * @param userId           Authenticated staff user ID (for `withUserContext`)
 * @param requestId        UUID of the fallback_request row
 * @param restaurantId     UUID of the restaurant — used as a second-factor scope guard
 * @param newStatus        Target status: 'in_progress' | 'resolved'
 * @param memberRestaurantIds List of restaurant IDs the user has membership for
 */
export async function transitionStatus(
	userId: string,
	requestId: string,
	restaurantId: string,
	newStatus: 'in-progress' | 'resolved',
	memberRestaurantIds: string[]
): Promise<void> {
	const parsed = transitionStatusInputSchema.safeParse({
		userId,
		requestId,
		restaurantId,
		newStatus
	});

	if (!parsed.success) {
		throw new StaffInboxTransitionError(
			`Invalid transition input: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`
		);
	}

	// Belt-and-suspenders membership check before the DB round-trip
	if (!memberRestaurantIds.includes(restaurantId)) {
		throw new StaffInboxAuthorizationError(
			`User ${userId} is not a member of restaurant ${restaurantId}`
		);
	}

	// Validate the transition is allowed. We look up the current request to
	// check its status before updating — this prevents idempotent re-applies
	// from silently jumping states.
	const requests = await listFallbackRequests([restaurantId]);
	const currentRow = requests.find((r) => r.id === requestId);

	if (!currentRow) {
		throw new StaffInboxTransitionError(`Request ${requestId} not found`);
	}

	const allowed = ALLOWED_TRANSITIONS[currentRow.status] ?? [];

	if (!allowed.includes(newStatus)) {
		throw new StaffInboxTransitionError(
			`Cannot transition from '${currentRow.status}' to '${newStatus}'. Allowed: [${allowed.join(', ')}]`
		);
	}

	await updateFallbackStatus(requestId, restaurantId, newStatus, userId);
}
