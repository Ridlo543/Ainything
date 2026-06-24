/**
 * Subdomain service.
 *
 * Generates and provisions workspace_host for a newly created organization.
 * workspace_host is stored on the organizations table and used by the
 * host-resolver to route subdomain-based requests to the right tenant.
 *
 * Format: {slug}.lingua.app
 * e.g.   bali-table-group → bali-table-group.lingua.app
 *
 * DNS wildcard (*.lingua.app) must be configured in production separately.
 * This service only handles the DB side.
 */

import { getPool } from '$lib/server/db/postgres';
import { appEnv } from '$lib/server/config/env';

/** The apex domain used for subdomain generation (configurable via PUBLIC_APP_DOMAIN). */
function getApexDomain(): string {
	// Allow override for staging/test, e.g. "lingua-staging.app"
	const raw = process.env.PUBLIC_APP_DOMAIN ?? '';
	if (raw) return raw;
	// Fall back to extracting domain from PUBLIC_APP_URL
	try {
		const url = new URL(appEnv.publicAppUrl);
		return url.hostname;
	} catch {
		return 'lingua.app';
	}
}

/**
 * Generate the workspace_host value for an organization slug.
 * e.g. "bali-table-group" → "bali-table-group.lingua.app"
 */
export function generateWorkspaceHost(slug: string): string {
	return `${slug}.${getApexDomain()}`;
}

/**
 * Check if a workspace_host is already taken (global uniqueness).
 * Returns true if the host is available.
 */
export async function isWorkspaceHostAvailable(host: string): Promise<boolean> {
	const pool = getPool();
	const { rows } = await pool.query<{ exists: boolean }>(
		`SELECT EXISTS (
			SELECT 1 FROM organizations WHERE workspace_host = $1
		) AS exists`,
		[host]
	);
	return !rows[0]?.exists;
}

/**
 * Set workspace_host on an organization row.
 * Idempotent: if a host is already set, does nothing and returns the existing value.
 * Throws if the generated host is already taken by a different org.
 */
export async function provisionSubdomain(organizationId: string): Promise<string> {
	const pool = getPool();

	// Fetch current slug and workspace_host
	const { rows } = await pool.query<{ slug: string; workspace_host: string | null }>(
		`SELECT slug, workspace_host FROM organizations WHERE id = $1::uuid`,
		[organizationId]
	);

	if (!rows[0]) throw new Error(`Organization ${organizationId} not found`);
	const { slug, workspace_host } = rows[0];

	// Idempotent: already provisioned
	if (workspace_host) return workspace_host;

	const host = generateWorkspaceHost(slug);

	const available = await isWorkspaceHostAvailable(host);
	if (!available) {
		throw new Error(
			`Workspace host '${host}' is already taken. Rename the organization slug first.`
		);
	}

	await pool.query(`UPDATE organizations SET workspace_host = $1 WHERE id = $2::uuid`, [
		host,
		organizationId
	]);

	return host;
}

/**
 * Provision subdomain during registration, silently ignoring errors so a
 * DB write failure never blocks the user from completing sign-up.
 * Logs a warning so ops can catch and backfill if needed.
 */
export async function tryProvisionSubdomain(organizationId: string): Promise<void> {
	try {
		await provisionSubdomain(organizationId);
	} catch (err) {
		console.warn('[subdomain] Failed to provision workspace_host:', err);
	}
}
