import { describe, expect, it } from 'vitest';
import { withUserContext, withPublicSessionContext } from '$lib/server/db/postgres';
import { resolveTenantContextFromDatabase } from './tenant-repository';

const runDbTests = process.env.RUN_DB_TESTS === 'true';
const describeDb = runDbTests ? describe : describe.skip;

describeDb('tenant repository with PostgreSQL RLS', () => {
	it('keeps identical table codes scoped per restaurant', async () => {
		const result = await withUserContext('user-owner-bali', async (client) =>
			client.query<{ restaurant_id: string }>(
				`
					SELECT DISTINCT restaurant_id::text
					FROM restaurant_tables
					WHERE code = 'T07'
					ORDER BY restaurant_id::text
				`
			)
		);

		expect(result.rows.length).toBeGreaterThan(1);
	});

	it('prevents a Bali owner from reading Jakarta restaurants through the app role', async () => {
		const tenant = await resolveTenantContextFromDatabase({
			id: 'user-owner-bali',
			email: 'owner@bali-table.test',
			name: 'Made Restaurant Owner',
			defaultOrganizationId: '10000000-0000-0000-0000-000000000001'
		});

		expect(tenant.restaurants.some((restaurant) => restaurant.slug === 'uma-karang')).toBe(true);
		expect(tenant.restaurants.some((restaurant) => restaurant.slug === 'taman-sate')).toBe(false);
	});

	it('enforces restaurant access in direct app-role queries', async () => {
		await withUserContext('user-staff-jakarta', async (client) => {
			const result = await client.query<{ slug: string }>(
				`
					SELECT slug
					FROM restaurants
					ORDER BY slug
				`
			);

			// The public_active_select policy exposes ALL active restaurants to lingua_app.
			expect(result.rows.map((row) => row.slug).sort()).toEqual([
				'rempah-terrace',
				'senja-ramen-bali',
				'taman-sate',
				'uma-karang'
			]);
		});
	});

	// ── New: Phase 6b / Phase 5 gap ────────────────────────────────────────────

	it('owner sees all restaurants in their own organization', async () => {
		// Bali owner (membership 30000000-…-001) is linked to uma-karang and one
		// more restaurant in org 10000000-…-001 via membership_restaurants in seed.
		const tenant = await resolveTenantContextFromDatabase({
			id: 'user-owner-bali',
			email: 'owner@bali-table.test',
			name: 'Made Restaurant Owner',
			defaultOrganizationId: '10000000-0000-0000-0000-000000000001'
		});

		// Both Bali restaurants must be visible; Jakarta ones must not.
		const slugs = tenant.restaurants.map((r) => r.slug).sort();
		expect(slugs.length).toBe(2);
		expect(slugs.every((slug) => !['taman-sate', 'rempah-terrace'].includes(slug))).toBe(true);
	});

	it('rejects a guest fallback insert with a session from a different restaurant', async () => {
		// Create a real session for Uma Karang.
		// Use withUserContext so the RETURNING clause's select policy passes.
		const sessionResult = await withUserContext('user-owner-bali', async (client) => {
			return client.query<{ id: string }>(
				`
					INSERT INTO customer_sessions (organization_id, restaurant_id, table_id, language_tag, preferences)
					SELECT
						'10000000-0000-0000-0000-000000000001',
						'40000000-0000-0000-0000-000000000001',
						t.id,
						'en',
						'{}'::jsonb
					FROM restaurant_tables t
					WHERE t.restaurant_id = '40000000-0000-0000-0000-000000000001'
					LIMIT 1
					RETURNING id::text
				`
			);
		});

		const sessionId = sessionResult.rows[0]?.id;
		expect(sessionId).toBeDefined();

		// Attempt to insert a fallback request for the Jakarta restaurant (40000000-…-002)
		// while supplying a session that belongs to the Bali restaurant (40000000-…-001).
		// The 0004 RLS policy requires session_id = app.public_session_id AND the session
		// must belong to the same restaurant_id as the fallback row. This should throw.
		await expect(
			withPublicSessionContext(sessionId!, async (client) => {
				return client.query(
					`
						INSERT INTO fallback_requests (
							organization_id,
							restaurant_id,
							session_id,
							table_id,
							status,
							priority,
							language_tag,
							guest_need,
							summary
						)
						SELECT
							'10000000-0000-0000-0000-000000000002',
							'40000000-0000-0000-0000-000000000002',
							$1::uuid,
							t.id,
							'new',
							'normal',
							'en',
							'Cross-tenant injection attempt',
							''
						FROM restaurant_tables t
						WHERE t.restaurant_id = '40000000-0000-0000-0000-000000000002'
						LIMIT 1
					`,
					[sessionId]
				);
			})
		).rejects.toThrow();
	});
});
