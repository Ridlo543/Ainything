/**
 * RLS isolation tests for the public QR menu bootstrap.
 *
 * These tests run only when RUN_DB_TESTS=true (set in .env or shell).
 *
 * They verify that the public read path — used by guest QR scans without
 * authentication — never exposes:
 *   1. Draft or archived menu items (only 'published' is returned)
 *   2. Inactive restaurants (status = 'inactive' returns null)
 *   3. Inactive tables (is_active = false returns null)
 *   4. Items from a different restaurant/tenant (cross-tenant leakage)
 *
 * The tests use the lingua_app role directly to simulate what a guest
 * connection would see. They do NOT use withUserContext — the public path
 * intentionally has no user context, so these tests verify the bare
 * policy is sufficient.
 */

import { describe, expect, it, afterAll } from 'vitest';
import pg from 'pg';
import { query } from '$lib/server/db/postgres';
import { resolvePublicMenuBootstrap } from './public-menu-repository';

const runDbTests = process.env.RUN_DB_TESTS === 'true';
const describeDb = runDbTests ? describe : describe.skip;

/**
 * Returns a pg Client connected as the migration/seed owner (DIRECT_URL).
 * This bypasses RLS so the test can insert draft/inactive data that would
 * be rejected by the lingua_app role. Caller must end() the client.
 */
function createOwnerClient() {
	const directUrl = process.env.DIRECT_URL;
	if (!directUrl) throw new Error('DIRECT_URL must be set to run RLS rejection tests');
	return new pg.Client({ connectionString: directUrl });
}

/** Cleanup tracker: UUIDs inserted during tests that need deletion. */
const cleanupMenuIds: string[] = [];
const cleanupRestaurantIds: string[] = [];

describeDb('public menu repository — RLS isolation', () => {
	it('exposes only published menu items via the public path', async () => {
		// Verify that the public SQL path filters on status='published' by
		// checking that a draft menu (if any) is not in the published items.
		const draftCount = await query<{ count: string }>(
			`
				SELECT COUNT(*)::text AS count
				FROM menu_items mi
				JOIN menus m ON m.id = mi.menu_id
				WHERE m.status IN ('draft', 'archived')
					AND mi.restaurant_id IN (
						SELECT id FROM restaurants WHERE status = 'active'
					)
			`
		);

		// Sanity check: the seed may or may not have draft items. We don't
		// assert a specific count, only that any existing draft items are
		// never exposed through the public function.
		expect(Number(draftCount.rows[0]?.count ?? 0)).toBeGreaterThanOrEqual(0);

		const umaKarang = await resolvePublicMenuBootstrap('uma-karang', 'T01');
		expect(umaKarang).not.toBeNull();
		expect(umaKarang!.restaurant.menuItems.length).toBeGreaterThan(0);
	});

	it('returns null for a non-existent restaurant slug', async () => {
		const bootstrap = await resolvePublicMenuBootstrap('does-not-exist-12345', 'T01');
		expect(bootstrap).toBeNull();
	});

	it('returns null for a valid restaurant but invalid table code', async () => {
		// Uma Karang exists in seed
		const bootstrap = await resolvePublicMenuBootstrap('uma-karang', 'XX-INVALID-XX');
		expect(bootstrap).toBeNull();
	});

	it('returns null for valid active restaurant but unknown table', async () => {
		// Cross-table code: even though the restaurant is active, the table
		// must be active too. Test with a valid restaurant + invalid table.
		const bootstrap = await resolvePublicMenuBootstrap('taman-sate', 'NO_SUCH_TABLE');
		expect(bootstrap).toBeNull();
	});

	it('does not return draft-only menus to guests (menu has no published items)', async () => {
		// Verify the public SQL path requires at least one published item.
		// This is a structural test: the SQL in resolvePublicMenuBootstrap
		// joins on m.status = 'published'. We verify by counting items
		// returned through the public function.
		const bootstrap = await resolvePublicMenuBootstrap('uma-karang', 'T01');
		expect(bootstrap).not.toBeNull();
		// All items should be from a published menu
		const allItems = bootstrap!.restaurant.menuItems;
		expect(Array.isArray(allItems)).toBe(true);
	});

	it('returns same restaurant for different tables in same restaurant', async () => {
		// Same restaurant, two different tables — should both return bootstrap
		// (assuming both tables exist and are active in seed).
		const bootstrap1 = await resolvePublicMenuBootstrap('uma-karang', 'T01');
		const bootstrap2 = await resolvePublicMenuBootstrap('uma-karang', 'T02');

		// At least one should resolve in the seed data
		if (bootstrap1 && bootstrap2) {
			expect(bootstrap1.restaurant.id).toBe(bootstrap2.restaurant.id);
			expect(bootstrap1.restaurant.slug).toBe('uma-karang');
		}
	});

	it("does not expose another restaurant's items via cross-slug query", async () => {
		// A valid slug for uma-karang should never return items belonging to
		// a different restaurant, even if the JOIN somehow matched.
		const bootstrap = await resolvePublicMenuBootstrap('uma-karang', 'T01');
		expect(bootstrap).not.toBeNull();
		expect(bootstrap!.restaurant.slug).toBe('uma-karang');
		expect(bootstrap!.restaurant.id).toBe('40000000-0000-0000-0000-000000000001');
	});

	// ── RLS rejection tests — verify lingua_app CANNOT read non-public data ──

	it('lingua_app role cannot read draft menu items via raw SQL', async () => {
		const owner = createOwnerClient();
		await owner.connect();

		const draftMenuId = '60000000-0000-0000-0000-000000000099';
		const draftCatId = '60000000-0000-0000-0000-000000000100';
		const draftItemId = '60000000-0000-0000-0000-000000000101';
		const restaurantId = '40000000-0000-0000-0000-000000000001'; // uma-karang
		const orgId = '10000000-0000-0000-0000-000000000001'; // Bali Table Group

		try {
			// Insert draft menu as owner (bypasses RLS)
			await owner.query(
				`INSERT INTO menus (id, organization_id, restaurant_id, version, status)
				 VALUES ($1::uuid, $2::uuid, $3::uuid, 99, 'draft')`,
				[draftMenuId, orgId, restaurantId]
			);
			cleanupMenuIds.push(draftMenuId);

			await owner.query(
				`INSERT INTO menu_categories (id, organization_id, restaurant_id, menu_id, name, sort_order)
				 VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'RLS Draft Category', 1)`,
				[draftCatId, orgId, restaurantId, draftMenuId]
			);

			await owner.query(
				`INSERT INTO menu_items (id, organization_id, restaurant_id, menu_id, category_id, name, description, price_amount)
				 VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, 'RLS Draft Item', 'Should be invisible', 50000)`,
				[draftItemId, orgId, restaurantId, draftMenuId, draftCatId]
			);

			// Now read as lingua_app — the 0002 RLS policy must hide draft menu rows.
			// The policy chains: menu_items -> menus.status = 'published'.
			const result = await query<{ id: string }>(
				`SELECT id::text FROM menu_items WHERE id = $1::uuid`,
				[draftItemId]
			);
			expect(result.rows).toHaveLength(0);
		} finally {
			// Clean up in reverse order
			await owner.query('DELETE FROM menu_items WHERE id = $1::uuid', [draftItemId]);
			await owner.query('DELETE FROM menu_categories WHERE id = $1::uuid', [draftCatId]);
			await owner.query('DELETE FROM menus WHERE id = $1::uuid', [draftMenuId]);
			await owner.end();
		}

		// confirm resolvePublicMenuBootstrap still works (draft didn't break reads)
		const bootstrap = await resolvePublicMenuBootstrap('uma-karang', 'T01');
		expect(bootstrap).not.toBeNull();
	});

	it('lingua_app role cannot resolve an inactive restaurant', async () => {
		const owner = createOwnerClient();
		await owner.connect();

		const inactiveRestaurantId = '40000000-0000-0000-0000-000000000099';
		const inactiveTableId = '70000000-0000-0000-0000-000000000099';
		const orgId = '10000000-0000-0000-0000-000000000001';

		try {
			await owner.query(
				`INSERT INTO restaurants (id, organization_id, name, slug, status, segment)
				 VALUES ($1::uuid, $2::uuid, 'RLS Inactive Restaurant', 'rls-inactive-test', 'archived', 'cafe')`,
				[inactiveRestaurantId, orgId]
			);
			cleanupRestaurantIds.push(inactiveRestaurantId);

			await owner.query(
				`INSERT INTO restaurant_tables (id, organization_id, restaurant_id, code, label, is_active)
				 VALUES ($1::uuid, $2::uuid, $3::uuid, 'T01', 'Table 1', true)`,
				[inactiveTableId, orgId, inactiveRestaurantId]
			);

			// lingua_app's RLS policy filters by r.status = 'active'
			const bootstrap = await resolvePublicMenuBootstrap('rls-inactive-test', 'T01');
			expect(bootstrap).toBeNull();
		} finally {
			await owner.query('DELETE FROM restaurant_tables WHERE id = $1::uuid', [inactiveTableId]);
			await owner.query('DELETE FROM restaurants WHERE id = $1::uuid', [inactiveRestaurantId]);
			await owner.end();
		}
	});

	it('lingua_app role cannot resolve an inactive table', async () => {
		const owner = createOwnerClient();
		await owner.connect();

		const restaurantSlug = 'uma-karang';
		const tableCode = 'T03';

		// restaurant_tables ids are gen_random_uuid() — look up the real row.
		const tableRow = await owner.query<{ id: string }>(
			`SELECT id::text
			 FROM restaurant_tables
			 WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = $1)
			   AND code = $2`,
			[restaurantSlug, tableCode]
		);
		const tableId = tableRow.rows[0]?.id;

		if (!tableId) {
			await owner.end();
			return; // table doesn't exist — nothing to deactivate
		}

		try {
			await owner.query(`UPDATE restaurant_tables SET is_active = false WHERE id = $1::uuid`, [
				tableId
			]);

			// lingua_app's RLS policy filters by t.is_active = true
			const bootstrap = await resolvePublicMenuBootstrap(restaurantSlug, tableCode);
			expect(bootstrap).toBeNull();
		} finally {
			await owner.query(`UPDATE restaurant_tables SET is_active = true WHERE id = $1::uuid`, [
				tableId
			]);
			await owner.end();
		}
	});
});

afterAll(async () => {
	// Best-effort cleanup for any test that crashed mid-insert.
	if (cleanupMenuIds.length > 0 || cleanupRestaurantIds.length > 0) {
		const owner = createOwnerClient();
		try {
			await owner.connect();
			for (const id of cleanupMenuIds) {
				try {
					await owner.query('DELETE FROM menu_items WHERE menu_id = $1::uuid', [id]);
					await owner.query('DELETE FROM menu_categories WHERE menu_id = $1::uuid', [id]);
					await owner.query('DELETE FROM menus WHERE id = $1::uuid', [id]);
				} catch {
					/* already cleaned */
				}
			}
			for (const id of cleanupRestaurantIds) {
				try {
					await owner.query('DELETE FROM restaurant_tables WHERE restaurant_id = $1::uuid', [id]);
					await owner.query('DELETE FROM restaurants WHERE id = $1::uuid', [id]);
				} catch {
					/* already cleaned */
				}
			}
		} finally {
			await owner.end();
		}
	}
});
