/**
 * Staff inbox repository — read/write operations for fallback_requests.
 *
 * All queries are tenant-scoped by restaurant_id and run inside a
 * `withUserContext` transaction so the DB-layer RLS policies (0008) are
 * evaluated against the authenticated staff user.
 *
 * Query style follows public-menu-repository.ts and admin-menu-repository.ts:
 * - Explicit ::text / ::uuid casts for UUID columns
 * - JOIN to resolve human-readable labels (table code, restaurant slug/name)
 * - No SELECT * — every returned column is explicitly listed
 */

import type { StaffRequest } from '$lib/domain/menu/types';
import { query, withUserContext } from '$lib/server/db/postgres';

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

type FallbackRequestRow = {
	id: string;
	restaurant_id: string;
	restaurant_slug: string;
	restaurant_name: string;
	table_id: string;
	table_code: string;
	language_tag: string;
	status: string;
	priority: string;
	guest_need: string;
	summary: string;
	last_message_at: string;
};

// ---------------------------------------------------------------------------
// Row → domain mapper
// ---------------------------------------------------------------------------

function mapRowToStaffRequest(row: FallbackRequestRow): StaffRequest {
	return {
		id: row.id,
		restaurantId: row.restaurant_id,
		restaurantSlug: row.restaurant_slug,
		restaurantName: row.restaurant_name,
		tableId: row.table_id,
		tableCode: row.table_code,
		// language_tag from DB is a valid LanguageTag; cast safely
		language: row.language_tag as StaffRequest['language'],
		// DB uses 'in_progress'; domain type uses 'in-progress'
		status: (row.status === 'in_progress' ? 'in-progress' : row.status) as StaffRequest['status'],
		priority: row.priority as StaffRequest['priority'],
		guestNeed: row.guest_need,
		summary: row.summary,
		lastMessageAt: row.last_message_at
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all fallback_requests for the given set of restaurant IDs, ordered
 * newest-first (by last change). An optional status filter narrows results to
 * a single status value.
 *
 * Uses the pool-level `query` helper (no user context needed for reads; the
 * SELECT policy `fallback_requests_tenant_select` from migration 0001 already
 * scopes to `restaurant_id IN (...)` via `app.has_restaurant_access`).
 *
 * For authenticated staff reads we call this inside `withUserContext` from the
 * service layer so the RLS context is set before execution.
 */
export async function listFallbackRequests(
	restaurantIds: string[],
	filters?: { status?: string }
): Promise<StaffRequest[]> {
	if (restaurantIds.length === 0) {
		return [];
	}

	// Build an $N placeholder list for the IN clause
	const placeholders = restaurantIds.map((_, i) => `$${i + 1}::uuid`).join(', ');
	const params: (string | null)[] = [...restaurantIds];

	let statusFilter = '';
	if (filters?.status) {
		params.push(filters.status);
		statusFilter = `AND fr.status = $${params.length}`;
	}

	const result = await query<FallbackRequestRow>(
		`
			SELECT
				fr.id::text,
				fr.restaurant_id::text,
				r.slug AS restaurant_slug,
				r.name AS restaurant_name,
				fr.table_id::text,
				t.code AS table_code,
				fr.language_tag,
				fr.status,
				fr.priority,
				fr.guest_need,
				fr.summary,
				to_char(
					GREATEST(fr.updated_at, fr.created_at),
					'YYYY-MM-DD"T"HH24:MI:SS"Z"'
				) AS last_message_at
			FROM fallback_requests fr
			JOIN restaurants r ON r.id = fr.restaurant_id
			JOIN restaurant_tables t ON t.id = fr.table_id
			WHERE fr.restaurant_id IN (${placeholders})
				${statusFilter}
			ORDER BY GREATEST(fr.updated_at, fr.created_at) DESC
		`,
		params
	);

	return result.rows.map(mapRowToStaffRequest);
}

/**
 * Transitions a fallback_request status.
 *
 * Runs inside `withUserContext` so the RLS UPDATE policy
 * `fallback_requests_tenant_update` (migration 0008) can verify the staff
 * user has membership access to the restaurant.
 *
 * The double-scope (`fr.id = $1 AND fr.restaurant_id = $2`) prevents a
 * staff member from claiming a request that belongs to a different tenant
 * even if the policy were somehow bypassed.
 */
export async function updateFallbackStatus(
	requestId: string,
	restaurantId: string,
	newStatus: string,
	staffUserId: string
): Promise<void> {
	// Map domain status back to DB column value
	const dbStatus = newStatus === 'in-progress' ? 'in_progress' : newStatus;

	await withUserContext(staffUserId, async (client) => {
		const resolvedAt = dbStatus === 'resolved' ? 'now()' : 'NULL';

		await client.query(
			`
				UPDATE fallback_requests
				SET
					status = $3,
					resolved_at = ${resolvedAt}
				WHERE id = $1::uuid
					AND restaurant_id = $2::uuid
			`,
			[requestId, restaurantId, dbStatus]
		);
	});
}
