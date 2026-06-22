/**
 * Repository for restaurant tables.
 *
 * Tables are QR-scoped entry points for a customer session. The QR path is
 * already stored on the row (`restaurant_tables.qr_path`) by the seed/migration
 * so admin/staff tooling can render the correct URL without recomputing the
 * tenant scope.
 *
 * All reads are tenant-scoped through the 0001 RLS SELECT policy
 * (`restaurant_tables_tenant_select`) — the bare pool connection is enough
 * because the policy restricts `lingua_app` to rows where
 * `app.has_restaurant_access(restaurant_id)`.
 */

import { query } from '$lib/server/db/postgres';

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

type RestaurantTableRow = {
	id: string;
	organization_id: string;
	restaurant_id: string;
	code: string;
	label: string;
	is_active: boolean;
	qr_path: string;
};

import type { RestaurantTable } from '$lib/domain/table/types';
export type { RestaurantTable };

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapRowToTable(row: RestaurantTableRow): RestaurantTable {
	return {
		id: row.id,
		organizationId: row.organization_id,
		restaurantId: row.restaurant_id,
		code: row.code,
		label: row.label,
		isActive: row.is_active,
		qrPath: row.qr_path
	};
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Lists all active tables for a restaurant, ordered by code (T01, T02, … B12).
 * Inactive tables are filtered out so the QR manager never prints codes for
 * seats that are not in service.
 */
export async function listActiveTablesForRestaurant(
	restaurantId: string
): Promise<RestaurantTable[]> {
	const result = await query<RestaurantTableRow>(
		`
			SELECT
				id::text,
				organization_id::text,
				restaurant_id::text,
				code,
				label,
				is_active,
				qr_path
			FROM restaurant_tables
			WHERE restaurant_id = $1::uuid
				AND is_active = true
			ORDER BY code ASC
		`,
		[restaurantId]
	);

	return result.rows.map(mapRowToTable);
}
