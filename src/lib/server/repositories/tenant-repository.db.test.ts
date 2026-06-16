import { describe, expect, it } from 'vitest';
import { withUserContext } from '$lib/server/db/postgres';
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

			expect(result.rows.map((row) => row.slug)).toEqual(['rempah-terrace', 'taman-sate']);
		});
	});
});
