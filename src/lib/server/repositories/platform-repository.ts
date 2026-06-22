import { getPool } from '$lib/server/db/postgres';

export type PlatformOrganizationRow = {
	id: string;
	name: string;
	slug: string;
	plan: string;
	status: string;
	restaurantCount: number;
	userCount: number;
	createdAt: string;
};

export type PlatformRestaurantRow = {
	id: string;
	name: string;
	slug: string;
	segment: string;
	organizationName: string;
	status: string;
	tableCount: number;
	createdAt: string;
};

export type PlatformStatsRow = {
	totalOrganizations: number;
	totalRestaurants: number;
	platformUsers: number;
};

export async function getPlatformStatsRow(): Promise<PlatformStatsRow> {
	const pool = getPool();
	const [orgs, restaurants, users] = await Promise.all([
		pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM organizations`),
		pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM restaurants`),
		pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM app_users`)
	]);

	return {
		totalOrganizations: Number(orgs.rows[0]?.count ?? 0),
		totalRestaurants: Number(restaurants.rows[0]?.count ?? 0),
		platformUsers: Number(users.rows[0]?.count ?? 0)
	};
}

export async function listOrganizationsRows(opts: {
	limit: number;
	offset: number;
}): Promise<PlatformOrganizationRow[]> {
	const { limit, offset } = opts;
	const pool = getPool();

	const { rows } = await pool.query<PlatformOrganizationRow>(
		`
		SELECT
			o.id::text,
			o.name,
			o.slug,
			o.plan,
			o.status,
			COUNT(DISTINCT r.id) AS "restaurantCount",
			COUNT(DISTINCT m.user_id) AS "userCount",
			o.created_at AS "createdAt"
		FROM organizations o
		LEFT JOIN restaurants r ON r.organization_id = o.id
		LEFT JOIN memberships m ON m.organization_id = o.id
		GROUP BY o.id, o.name, o.slug, o.plan, o.status, o.created_at
		ORDER BY o.created_at DESC
		LIMIT $1 OFFSET $2
		`,
		[limit, offset]
	);

	return rows;
}

export async function listRestaurantsRows(opts: {
	limit: number;
	offset: number;
	organizationId?: string;
}): Promise<PlatformRestaurantRow[]> {
	const { limit, offset, organizationId } = opts;
	const pool = getPool();
	const whereClause = organizationId ? `WHERE r.organization_id = $3::uuid` : '';
	const params = organizationId ? [limit, offset, organizationId] : [limit, offset];

	const { rows } = await pool.query<PlatformRestaurantRow>(
		`
		SELECT
			r.id::text,
			r.name,
			r.slug,
			r.segment,
			o.name AS "organizationName",
			r.status,
			r.table_count AS "tableCount",
			r.created_at AS "createdAt"
		FROM restaurants r
		JOIN organizations o ON o.id = r.organization_id
		${whereClause}
		ORDER BY r.created_at DESC
		LIMIT $1 OFFSET $2
		`,
		params
	);

	return rows;
}
