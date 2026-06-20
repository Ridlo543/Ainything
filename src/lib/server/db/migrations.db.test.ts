import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { query, withUserContext } from '$lib/server/db/postgres';

const runDbTests = process.env.RUN_DB_TESTS === 'true';
const describeDb = runDbTests ? describe : describe.skip;

describeDb('RLS public policies after migrations', () => {
	let testOrgId: string;
	let activeRestaurantId: string;
	let inactiveRestaurantId: string;
	let publishedMenuId: string;
	let draftMenuId: string;
	let activeTableId: string;
	let inactiveTableId: string;
	let publishedKnowledgeId: string;
	let draftKnowledgeId: string;

	beforeAll(async () => {
		// Insert test data using user context to bypass RLS for writes
		await withUserContext('user-owner-bali', async (client) => {
			// Insert test organization
			const orgResult = await client.query<{ id: string }>(
				`
				INSERT INTO organizations (name, slug, status)
				VALUES ('RLS Test Org', 'rls-test-org-2026', 'active')
				RETURNING id::text
				`
			);
			testOrgId = orgResult.rows[0].id;

			// Insert active restaurant
			const activeRestResult = await client.query<{ id: string }>(
				`
				INSERT INTO restaurants (organization_id, name, slug, segment, status)
				VALUES ($1::uuid, 'RLS Test Active', 'rls-test-active-2026', 'cafe', 'active')
				RETURNING id::text
				`,
				[testOrgId]
			);
			activeRestaurantId = activeRestResult.rows[0].id;

			// Insert inactive restaurant
			const inactiveRestResult = await client.query<{ id: string }>(
				`
				INSERT INTO restaurants (organization_id, name, slug, segment, status)
				VALUES ($1::uuid, 'RLS Test Inactive', 'rls-test-inactive-2026', 'cafe', 'archived')
				RETURNING id::text
				`,
				[testOrgId]
			);
			inactiveRestaurantId = inactiveRestResult.rows[0].id;

			// Insert active table
			const activeTableResult = await client.query<{ id: string }>(
				`
				INSERT INTO restaurant_tables (organization_id, restaurant_id, code, label, is_active)
				VALUES ($1::uuid, $2::uuid, 'RLS-T1', 'RLS Table 1', true)
				RETURNING id::text
				`,
				[testOrgId, activeRestaurantId]
			);
			activeTableId = activeTableResult.rows[0].id;

			// Insert inactive table
			const inactiveTableResult = await client.query<{ id: string }>(
				`
				INSERT INTO restaurant_tables (organization_id, restaurant_id, code, label, is_active)
				VALUES ($1::uuid, $2::uuid, 'RLS-T2', 'RLS Table 2', false)
				RETURNING id::text
				`,
				[testOrgId, activeRestaurantId]
			);
			inactiveTableId = inactiveTableResult.rows[0].id;

			// Insert published menu
			const publishedMenuResult = await client.query<{ id: string }>(
				`
				INSERT INTO menus (organization_id, restaurant_id, version, status)
				VALUES ($1::uuid, $2::uuid, 9001, 'published')
				RETURNING id::text
				`,
				[testOrgId, activeRestaurantId]
			);
			publishedMenuId = publishedMenuResult.rows[0].id;

			// Insert draft menu
			const draftMenuResult = await client.query<{ id: string }>(
				`
				INSERT INTO menus (organization_id, restaurant_id, version, status)
				VALUES ($1::uuid, $2::uuid, 9002, 'draft')
				RETURNING id::text
				`,
				[testOrgId, activeRestaurantId]
			);
			draftMenuId = draftMenuResult.rows[0].id;

			// Insert published knowledge document
			const publishedKnowResult = await client.query<{ id: string }>(
				`
				INSERT INTO knowledge_documents (
					organization_id,
					restaurant_id,
					title,
					content,
					visibility,
					category
				)
				VALUES ($1::uuid, $2::uuid, 'RLS Test Published', 'Published content', 'published', 'general')
				RETURNING id::text
				`,
				[testOrgId, activeRestaurantId]
			);
			publishedKnowledgeId = publishedKnowResult.rows[0].id;

			// Insert draft knowledge document
			const draftKnowResult = await client.query<{ id: string }>(
				`
				INSERT INTO knowledge_documents (
					organization_id,
					restaurant_id,
					title,
					content,
					visibility,
					category
				)
				VALUES ($1::uuid, $2::uuid, 'RLS Test Draft', 'Draft content', 'draft', 'general')
				RETURNING id::text
				`,
				[testOrgId, activeRestaurantId]
			);
			draftKnowledgeId = draftKnowResult.rows[0].id;
		});
	});

	afterAll(async () => {
		// Clean up in reverse order due to foreign keys
		await withUserContext('user-owner-bali', async (client) => {
			await client.query('DELETE FROM knowledge_documents WHERE organization_id = $1::uuid', [
				testOrgId
			]);
			await client.query('DELETE FROM menus WHERE organization_id = $1::uuid', [testOrgId]);
			await client.query('DELETE FROM restaurant_tables WHERE organization_id = $1::uuid', [
				testOrgId
			]);
			await client.query('DELETE FROM restaurants WHERE organization_id = $1::uuid', [testOrgId]);
			await client.query('DELETE FROM organizations WHERE id = $1::uuid', [testOrgId]);
		});
	});

	it('only returns active restaurants via public policy', async () => {
		// Query without user context to test public policies
		const result = await query<{ id: string; slug: string; status: string }>(
			`
			SELECT id::text, slug, status
			FROM restaurants
			WHERE slug IN ('rls-test-active-2026', 'rls-test-inactive-2026')
			ORDER BY slug
			`
		);

		// Should only see the active restaurant
		expect(result.rows.length).toBe(1);
		expect(result.rows[0].slug).toBe('rls-test-active-2026');
		expect(result.rows[0].status).toBe('active');
	});

	it('only returns active tables via public policy', async () => {
		const result = await query<{ id: string; code: string; is_active: boolean }>(
			`
			SELECT id::text, code, is_active
			FROM restaurant_tables
			WHERE restaurant_id = $1::uuid
			ORDER BY code
			`,
			[activeRestaurantId]
		);

		// Should only see the active table
		expect(result.rows.length).toBe(1);
		expect(result.rows[0].code).toBe('RLS-T1');
		expect(result.rows[0].is_active).toBe(true);
	});

	it('only returns published menus via public policy', async () => {
		const result = await query<{ id: string; version: number; status: string }>(
			`
			SELECT id::text, version, status
			FROM menus
			WHERE restaurant_id = $1::uuid
			ORDER BY version
			`,
			[activeRestaurantId]
		);

		// Should only see the published menu
		expect(result.rows.length).toBe(1);
		expect(result.rows[0].version).toBe(9001);
		expect(result.rows[0].status).toBe('published');
	});

	it('does not return menus from inactive restaurants', async () => {
		// Insert a published menu for the inactive restaurant
		await withUserContext('user-owner-bali', async (client) => {
			await client.query(
				`
				INSERT INTO menus (organization_id, restaurant_id, version, status)
				VALUES ($1::uuid, $2::uuid, 9003, 'published')
				`,
				[testOrgId, inactiveRestaurantId]
			);
		});

		// Query without user context
		const result = await query<{ id: string; version: number }>(
			`
			SELECT id::text, version
			FROM menus
			WHERE restaurant_id = $1::uuid AND version = 9003
			`,
			[inactiveRestaurantId]
		);

		// Should not see the menu because the restaurant is inactive
		expect(result.rows.length).toBe(0);

		// Clean up
		await withUserContext('user-owner-bali', async (client) => {
			await client.query('DELETE FROM menus WHERE version = 9003');
		});
	});

	it('only returns published knowledge documents via public policy', async () => {
		const result = await query<{ id: string; title: string; visibility: string }>(
			`
			SELECT id::text, title, visibility
			FROM knowledge_documents
			WHERE restaurant_id = $1::uuid
			ORDER BY title
			`,
			[activeRestaurantId]
		);

		// Should only see the published knowledge document
		expect(result.rows.length).toBe(1);
		expect(result.rows[0].title).toBe('RLS Test Published');
		expect(result.rows[0].visibility).toBe('published');
	});

	it('does not return knowledge documents from inactive restaurants', async () => {
		// Insert a published knowledge doc for the inactive restaurant
		await withUserContext('user-owner-bali', async (client) => {
			await client.query(
				`
				INSERT INTO knowledge_documents (
					organization_id,
					restaurant_id,
					title,
					content,
					visibility,
					category
				)
				VALUES ($1::uuid, $2::uuid, 'RLS Test Inactive Rest', 'Content', 'published', 'general')
				`,
				[testOrgId, inactiveRestaurantId]
			);
		});

		// Query without user context
		const result = await query<{ title: string }>(
			`
			SELECT title
			FROM knowledge_documents
			WHERE restaurant_id = $1::uuid
			`,
			[inactiveRestaurantId]
		);

		// Should not see any docs because the restaurant is inactive
		expect(result.rows.length).toBe(0);

		// Clean up
		await withUserContext('user-owner-bali', async (client) => {
			await client.query(
				`DELETE FROM knowledge_documents WHERE restaurant_id = $1::uuid`,
				[inactiveRestaurantId]
			);
		});
	});

	it('verifies all active restaurants in seed data are visible', async () => {
		// This test verifies that the public policy works on existing seed data
		const result = await query<{ slug: string; status: string }>(
			`
			SELECT slug, status
			FROM restaurants
			ORDER BY slug
			`
		);

		// All returned restaurants must be active
		expect(result.rows.every((r) => r.status === 'active')).toBe(true);

		// Should include seed restaurants like 'uma-karang', 'taman-sate', etc.
		expect(result.rows.length).toBeGreaterThan(0);
	});
});
