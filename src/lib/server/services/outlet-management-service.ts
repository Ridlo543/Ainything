/**
 * outlet-management-service.ts — Service layer for outlet CRUD and settings.
 *
 * Mirrors the pattern from menu-admin-service.ts:
 *  - Tenant scope (organizationId) is ALWAYS derived from server-side TenantContext.
 *  - Every write runs inside withUserContext so RLS policies evaluate against
 *    the authenticated membership.
 *  - Input validation happens at the form action layer via Zod schemas; the
 *    service receives typed, pre-validated input.
 */

import type { AuthUser } from '$lib/domain/auth/types';
import type { Outlet, OutletTable } from '$lib/domain/outlet/types';
import type { OutletSettingsInput } from '$lib/domain/outlet/schema';
import { withUserContext } from '$lib/server/db/postgres';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';
import {
	createOutlet,
	getOutletById,
	getOutletSettings,
	getOutletWithCatalog,
	listOutlets,
	listTablesForOutlet,
	updateOutlet,
	upsertOutletTable,
	type OutletSettings
} from '$lib/server/repositories/outlet-repository';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class OutletNotFoundError extends Error {
	constructor(outletId: string) {
		super(`Outlet not found or access denied: ${outletId}`);
		this.name = 'OutletNotFoundError';
	}
}

export class OutletPermissionError extends Error {
	constructor(action: string) {
		super(`Permission denied: ${action} requires owner or manager role`);
		this.name = 'OutletPermissionError';
	}
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * Lists all active outlets for the authenticated user's organization.
 * RLS enforces visibility — no additional tenant guard needed on the SELECT.
 */
export async function listOutletsForUser(user: AuthUser): Promise<Outlet[]> {
	const tenant = await resolveTenantContext(user);
	return listOutlets(tenant.organization.id);
}

/**
 * Loads a single outlet with its full published catalog (sections + products).
 * Used by the dashboard overview and product editor pages.
 */
export async function getOutletDetail(
	user: AuthUser,
	outletId: string
): Promise<
	| (Outlet & {
			sections: string[];
			products: import('$lib/domain/outlet/types').Product[];
			importIssues: import('$lib/domain/outlet/types').ProductImportIssue[];
	  })
	| null
> {
	const tenant = await resolveTenantContext(user);
	return getOutletWithCatalog(outletId, tenant.organization.id);
}

/**
 * Retrieves outlet settings (opening hours, contact info, social links).
 */
export async function getSettings(
	user: AuthUser,
	outletId: string
): Promise<OutletSettings | null> {
	const tenant = await resolveTenantContext(user);
	return getOutletSettings(outletId, tenant.organization.id);
}

/**
 * Lists all outlet tables (for QR code management).
 */
export async function listTables(user: AuthUser, outletId: string): Promise<OutletTable[]> {
	const tenant = await resolveTenantContext(user);
	return listTablesForOutlet(outletId, tenant.organization.id);
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Creates a new outlet under the authenticated user's organization.
 * Only owners can create outlets.
 */
export async function createNewOutlet(
	user: AuthUser,
	input: import('$lib/domain/outlet/schema').CreateOutletInput
): Promise<Outlet> {
	const tenant = await resolveTenantContext(user);

	if (tenant.membership.role !== 'owner') {
		throw new OutletPermissionError('create outlet');
	}

	return withUserContext(user.id, async () => createOutlet(tenant.organization.id, input));
}

/**
 * Updates outlet settings (name, location, business type, etc.).
 * Owner and manager roles are allowed.
 */
export async function updateOutletSettings(
	user: AuthUser,
	outletId: string,
	input: Partial<OutletSettingsInput>
): Promise<Outlet> {
	const tenant = await resolveTenantContext(user);

	if (tenant.membership.role === 'staff') {
		throw new OutletPermissionError('update outlet settings');
	}

	// Build a partial update object — only include fields the caller provided.
	// updateOutlet accepts Partial<UpdateOutletInput> so undefined fields are ignored.
	const patch: Record<string, string> = {};
	if (input.name !== undefined) patch.name = input.name;
	if (input.location !== undefined) patch.location = input.location;
	if (input.businessType !== undefined) patch.businessType = input.businessType;
	if (input.timezone !== undefined) patch.timezone = input.timezone;
	if (input.defaultLanguageTag !== undefined) patch.defaultLanguageTag = input.defaultLanguageTag;
	if (input.description !== undefined) patch.description = input.description;

	const updated = await withUserContext(user.id, async () =>
		updateOutlet(outletId, tenant.organization.id, patch)
	);

	if (!updated) {
		throw new OutletNotFoundError(outletId);
	}

	return updated;
}

/**
 * Creates or updates a table entry for an outlet.
 * Used by QR code management in the dashboard.
 * Owner and manager roles are allowed.
 */
export async function saveOutletTable(
	user: AuthUser,
	outletId: string,
	table: { code: string; label: string; isActive?: boolean }
): Promise<OutletTable> {
	const tenant = await resolveTenantContext(user);

	if (tenant.membership.role === 'staff') {
		throw new OutletPermissionError('manage outlet tables');
	}

	// Verify the outlet belongs to the org before writing.
	const outlet = await getOutletById(outletId, tenant.organization.id);
	if (!outlet) {
		throw new OutletNotFoundError(outletId);
	}

	return withUserContext(user.id, async () =>
		upsertOutletTable({
			organizationId: tenant.organization.id,
			outletId,
			code: table.code,
			label: table.label,
			isActive: table.isActive ?? true
		})
	);
}
