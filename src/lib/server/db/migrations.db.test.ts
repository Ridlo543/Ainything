import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { query } from '$lib/server/db/postgres';
import pg from 'pg';

const runDbTests = process.env.RUN_DB_TESTS === 'true';
const describeDb = runDbTests ? describe : describe.skip;

let adminPool: pg.Pool | null = null;

function adminQuery<T extends pg.QueryResultRow>(text: string, params: unknown[] = []) {
	if (!adminPool) {
		const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
		if (!directUrl) throw new Error('Neither DIRECT_URL nor DATABASE_URL is configured');
		adminPool = new pg.Pool({ connectionString: directUrl, max: 2 });
	}
	return adminPool.query<T>(text, params as unknown[]);
}

describeDb('RLS public policies after migrations', () => {
	let testOrgId: string;
	let activeOutletId: string;
	let inactiveOutletId: string;

	beforeAll(async () => {
		const orgResult = await adminQuery<{ id: string }>(
			`INSERT INTO organizations (name, slug, status)
			 VALUES ('RLS Test Org', 'rls-test-org-2026', 'active')
			 RETURNING id::text`
		);
		testOrgId = orgResult.rows[0].id;

		const activeResult = await adminQuery<{ id: string }>(
			`INSERT INTO outlets (organization_id, name, slug, business_type, status)
			 VALUES ($1::uuid, 'RLS Test Active', 'rls-test-active-2026', 'retail', 'active')
			 RETURNING id::text`,
			[testOrgId]
		);
		activeOutletId = activeResult.rows[0].id;

		const inactiveResult = await adminQuery<{ id: string }>(
			`INSERT INTO outlets (organization_id, name, slug, business_type, status)
			 VALUES ($1::uuid, 'RLS Test Inactive', 'rls-test-inactive-2026', 'retail', 'archived')
			 RETURNING id::text`,
			[testOrgId]
		);
		inactiveOutletId = inactiveResult.rows[0].id;

		// Insert outlet_locations first (required FK for outlet_tables)
		const locResult = await adminQuery<{ id: string }>(
			`INSERT INTO outlet_locations (organization_id, outlet_id, code, name, is_primary)
			 VALUES ($1::uuid, $2::uuid, 'MAIN', 'Main Location', true)
			 RETURNING id::text`,
			[testOrgId, activeOutletId]
		);
		const locationId = locResult.rows[0].id;

		await adminQuery(
			`INSERT INTO outlet_tables (organization_id, outlet_id, location_id, code, label, is_active)
			 VALUES ($1::uuid, $2::uuid, $3::uuid, 'RLS-T1', 'RLS Table 1', true)`,
			[testOrgId, activeOutletId, locationId]
		);

		await adminQuery(
			`INSERT INTO outlet_tables (organization_id, outlet_id, location_id, code, label, is_active)
			 VALUES ($1::uuid, $2::uuid, $3::uuid, 'RLS-T2', 'RLS Table 2', false)`,
			[testOrgId, activeOutletId, locationId]
		);

		// Insert published + draft catalogs
		await adminQuery(
			`INSERT INTO catalogs (organization_id, outlet_id, version, status)
			 VALUES ($1::uuid, $2::uuid, 9001, 'published')`,
			[testOrgId, activeOutletId]
		);

		await adminQuery(
			`INSERT INTO catalogs (organization_id, outlet_id, version, status)
			 VALUES ($1::uuid, $2::uuid, 9002, 'draft')`,
			[testOrgId, activeOutletId]
		);

		// knowledge_documents was migrated from restaurant_id → outlet_id in migration 0026
		await adminQuery(
			`INSERT INTO knowledge_documents (organization_id, outlet_id, title, content, visibility)
			 VALUES ($1::uuid, $2::uuid, 'RLS Test Published', 'Published content', 'public')`,
			[testOrgId, activeOutletId]
		);

		await adminQuery(
			`INSERT INTO knowledge_documents (organization_id, outlet_id, title, content, visibility)
			 VALUES ($1::uuid, $2::uuid, 'RLS Test Draft', 'Draft content', 'staff-only')`,
			[testOrgId, activeOutletId]
		);
	});

	afterAll(async () => {
		await adminQuery('DELETE FROM knowledge_documents WHERE organization_id = $1::uuid', [
			testOrgId
		]);
		await adminQuery('DELETE FROM catalogs WHERE organization_id = $1::uuid', [testOrgId]);
		await adminQuery('DELETE FROM outlet_tables WHERE organization_id = $1::uuid', [testOrgId]);
		await adminQuery('DELETE FROM outlet_locations WHERE organization_id = $1::uuid', [testOrgId]);
		await adminQuery('DELETE FROM outlets WHERE organization_id = $1::uuid', [testOrgId]);
		await adminQuery('DELETE FROM organizations WHERE id = $1::uuid', [testOrgId]);
		if (adminPool) {
			await adminPool.end();
			adminPool = null;
		}
	});

	it('only returns active outlets via public policy', async () => {
		const result = await query<{ id: string; slug: string; status: string }>(
			`
			SELECT id::text, slug, status
			FROM outlets
			WHERE slug IN ('rls-test-active-2026', 'rls-test-inactive-2026')
			ORDER BY slug
			`
		);

		// Should only see the active outlet
		expect(result.rows.length).toBe(1);
		expect(result.rows[0].slug).toBe('rls-test-active-2026');
		expect(result.rows[0].status).toBe('active');
	});

	it('only returns active tables via public policy', async () => {
		const result = await query<{ id: string; code: string; is_active: boolean }>(
			`
			SELECT id::text, code, is_active
			FROM outlet_tables
			WHERE outlet_id = $1::uuid
			ORDER BY code
			`,
			[activeOutletId]
		);

		// Should only see the active table (RLS filters is_active = false)
		expect(result.rows.length).toBe(1);
		expect(result.rows[0].code).toBe('RLS-T1');
		expect(result.rows[0].is_active).toBe(true);
	});

	it('only returns published catalogs via public policy', async () => {
		const result = await query<{ id: string; version: number; status: string }>(
			`
			SELECT id::text, version, status
			FROM catalogs
			WHERE outlet_id = $1::uuid
			ORDER BY version
			`,
			[activeOutletId]
		);

		// Should only see the published catalog
		expect(result.rows.length).toBe(1);
		expect(result.rows[0].version).toBe(9001);
		expect(result.rows[0].status).toBe('published');
	});

	it('catalogs_active_public_select filters by status=published (not outlet status)', async () => {
		// The policy only checks catalog.status = 'published', not outlet.status.
		// A published catalog on an archived outlet is still visible to ainything_app.
		await adminQuery(
			`INSERT INTO catalogs (organization_id, outlet_id, version, status)
			 VALUES ($1::uuid, $2::uuid, 9003, 'published')`,
			[testOrgId, inactiveOutletId]
		);

		const result = await query<{ id: string; version: number }>(
			`SELECT id::text, version FROM catalogs WHERE outlet_id = $1::uuid AND version = 9003`,
			[inactiveOutletId]
		);

		// Policy allows any published catalog regardless of outlet status
		expect(result.rows.length).toBe(1);

		await adminQuery('DELETE FROM catalogs WHERE version = 9003');
	});

	it('knowledge_documents are tenant-scoped — only visible via org context', async () => {
		// knowledge_documents has no public SELECT policy — only tenant/platform.
		// ainything_app with no user context sees 0 rows via RLS.
		const publicResult = await query<{ id: string; title: string }>(
			`SELECT id::text, title FROM knowledge_documents WHERE outlet_id = $1::uuid`,
			[activeOutletId]
		);
		expect(publicResult.rows.length).toBe(0);

		// Admin (superuser bypasses RLS) sees the rows inserted in beforeAll.
		const adminResult = await adminQuery<{ title: string; visibility: string }>(
			`SELECT title, visibility FROM knowledge_documents WHERE outlet_id = $1::uuid ORDER BY title`,
			[activeOutletId]
		);
		expect(adminResult.rows.length).toBe(2);
		// ORDER BY title: "RLS Test Draft" < "RLS Test Published"
		expect(adminResult.rows[0].visibility).toBe('staff-only');
		expect(adminResult.rows[1].visibility).toBe('public');
	});

	it('knowledge_documents with public visibility exist for active outlet (admin view)', async () => {
		await adminQuery(
			`INSERT INTO knowledge_documents (organization_id, outlet_id, title, content, visibility)
			 VALUES ($1::uuid, $2::uuid, 'RLS Test Inactive Outlet', 'Content', 'public')`,
			[testOrgId, inactiveOutletId]
		);

		// Admin can see it (RLS bypassed)
		const adminResult = await adminQuery<{ title: string }>(
			`SELECT title FROM knowledge_documents WHERE outlet_id = $1::uuid`,
			[inactiveOutletId]
		);
		expect(adminResult.rows.length).toBe(1);

		// ainything_app with no context still sees 0 (no public policy on knowledge_documents)
		const publicResult = await query<{ title: string }>(
			`SELECT title FROM knowledge_documents WHERE outlet_id = $1::uuid`,
			[inactiveOutletId]
		);
		expect(publicResult.rows.length).toBe(0);

		await adminQuery('DELETE FROM knowledge_documents WHERE outlet_id = $1::uuid', [
			inactiveOutletId
		]);
	});

	it('verifies all active outlets in seed data are visible', async () => {
		const result = await query<{ slug: string; status: string }>(
			`
			SELECT slug, status
			FROM outlets
			ORDER BY slug
			`
		);

		// All returned outlets must be active
		expect(result.rows.every((r) => r.status === 'active')).toBe(true);

		// Should include seed outlets like 'uma-karang', 'taman-sate', etc.
		expect(result.rows.length).toBeGreaterThan(0);
	});
});
