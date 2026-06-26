import { describe, expect, it } from 'vitest';
import { withUserContext } from '$lib/server/db/postgres';
import { resolveTenantContextFromDatabase, resolveOutletTenantContext } from './tenant-repository';

const runDbTests = process.env.RUN_DB_TESTS === 'true';
const describeDb = runDbTests ? describe : describe.skip;

describeDb('tenant repository with PostgreSQL RLS', () => {
	it('keeps identical table codes scoped per outlet', async () => {
		// outlet_tables uses UNIQUE(outlet_id, code) — same code can exist in multiple outlets
		const result = await withUserContext('local:owner@bali-table.test', async (client) =>
			client.query<{ outlet_id: string }>(
				`
					SELECT DISTINCT outlet_id::text
					FROM outlet_tables
					WHERE code = 'T07'
					ORDER BY outlet_id::text
				`
			)
		);

		// T07 should appear in at least 2 outlets (uma-karang + taman-sate from seed)
		expect(result.rows.length).toBeGreaterThan(1);
	});

	it('prevents a Bali owner from reading Jakarta outlets through the app role', async () => {
		const tenant = await resolveTenantContextFromDatabase({
			id: 'local:owner@bali-table.test',
			email: 'owner@bali-table.test',
			name: 'Made Restaurant Owner',
			platformRole: 'org_owner',
			memberships: [
				{
					organizationId: '10000000-0000-0000-0000-000000000001',
					outletIds: [],
					role: 'org_owner'
				}
			]
		});

		// Bali org (10000000-…-001) owns uma-karang, senja-ramen-bali, pantai-padi
		expect(tenant.restaurants.some((r) => r.slug === 'uma-karang')).toBe(true);
		// Jakarta org outlets must not appear
		expect(tenant.restaurants.some((r) => r.slug === 'taman-sate')).toBe(false);
	});

	it('enforces outlet access in direct app-role queries', async () => {
		await withUserContext('local:staff@jakarta-hospitality.test', async (client) => {
			const result = await client.query<{ slug: string }>(
				`
					SELECT slug
					FROM outlets
					ORDER BY slug
				`
			);

			// The public_active_select policy exposes ALL active outlets to ainything_app.
			const slugs = result.rows.map((row) => row.slug);
			expect(slugs).toEqual(
				expect.arrayContaining([
					'rempah-terrace',
					'senja-ramen-bali',
					'taman-sate',
					'uma-karang'
				])
			);
			// Must not expose archived outlets
			expect(slugs.every((s) => !s.includes('inactive'))).toBe(true);
		});
	});

	it('owner sees all outlets in their own organization', async () => {
		const tenant = await resolveTenantContextFromDatabase({
			id: 'local:owner@bali-table.test',
			email: 'owner@bali-table.test',
			name: 'Made Restaurant Owner',
			platformRole: 'org_owner',
			memberships: [
				{
					organizationId: '10000000-0000-0000-0000-000000000001',
					outletIds: [],
					role: 'org_owner'
				}
			]
		});

		// Bali org (10000000-…-001) owns: uma-karang, senja-ramen-bali, pantai-padi
		// Jakarta org outlets (taman-sate, rempah-terrace) must not appear.
		const slugs = tenant.restaurants.map((r) => r.slug).sort();
		expect(slugs.length).toBe(3);
		expect(slugs).toContain('uma-karang');
		expect(slugs).toContain('senja-ramen-bali');
		expect(slugs).toContain('pantai-padi');
		expect(slugs.every((slug) => !['taman-sate', 'rempah-terrace'].includes(slug))).toBe(true);
	});

	it('resolveOutletTenantContext returns correct outlets for bali owner', async () => {
		const ctx = await resolveOutletTenantContext(
			{
				id: 'local:owner@bali-table.test',
				email: 'owner@bali-table.test',
				name: 'Made Restaurant Owner',
				platformRole: 'org_owner',
				memberships: [
					{
						organizationId: '10000000-0000-0000-0000-000000000001',
						outletIds: [],
						role: 'org_owner'
					}
				]
			},
			'uma-karang'
		);

		expect(ctx).not.toBeNull();
		expect(ctx!.activeOutlet.slug).toBe('uma-karang');
		expect(ctx!.outlets.length).toBe(3);
		expect(ctx!.outlets.some((o) => o.slug === 'pantai-padi')).toBe(true);
		expect(ctx!.outlets.some((o) => o.slug === 'taman-sate')).toBe(false);
	});
});
