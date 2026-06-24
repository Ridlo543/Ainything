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

export type PlatformOrganizationDetailRow = PlatformOrganizationRow & {
	workspaceHost: string;
};

export type PlatformRestaurantDetailRow = PlatformRestaurantRow & {
	organizationId: string;
	organizationSlug: string;
	location: string;
	defaultLanguageTag: string;
	timezone: string;
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
	status?: string;
}): Promise<PlatformOrganizationRow[]> {
	const { limit, offset, status } = opts;
	const pool = getPool();
	const filterAll = !status || status === 'all';
	const params: unknown[] = filterAll ? [limit, offset] : [limit, offset, status];
	const whereClause = filterAll ? '' : `WHERE o.status = $3`;

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
		${whereClause}
		GROUP BY o.id, o.name, o.slug, o.plan, o.status, o.created_at
		ORDER BY o.created_at DESC
		LIMIT $1 OFFSET $2
		`,
		params
	);

	return rows;
}

export async function listRestaurantsRows(opts: {
	limit: number;
	offset: number;
	organizationId?: string;
	status?: string;
}): Promise<PlatformRestaurantRow[]> {
	const { limit, offset, organizationId, status } = opts;
	const pool = getPool();
	const filterAll = !status || status === 'all';

	const conditions: string[] = [];
	const params: unknown[] = [limit, offset];

	if (organizationId) {
		params.push(organizationId);
		conditions.push(`r.organization_id = $${params.length}::uuid`);
	}
	if (!filterAll) {
		params.push(status);
		conditions.push(`r.status = $${params.length}`);
	}
	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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

export async function getOrganizationBySlugRow(
	slug: string
): Promise<PlatformOrganizationDetailRow | null> {
	const pool = getPool();

	const { rows } = await pool.query<PlatformOrganizationDetailRow>(
		`
		SELECT
			o.id::text,
			o.name,
			o.slug,
			o.plan,
			o.status,
			COALESCE(o.workspace_host, '') AS "workspaceHost",
			COUNT(DISTINCT r.id) AS "restaurantCount",
			COUNT(DISTINCT m.user_id) AS "userCount",
			o.created_at AS "createdAt"
		FROM organizations o
		LEFT JOIN restaurants r ON r.organization_id = o.id
		LEFT JOIN memberships m ON m.organization_id = o.id
		WHERE o.slug = $1
		GROUP BY o.id, o.name, o.slug, o.plan, o.status, o.workspace_host, o.created_at
		`,
		[slug]
	);

	return rows[0] ?? null;
}

export async function updateOrganizationStatus(
	id: string,
	status: 'active' | 'paused' | 'archived'
): Promise<void> {
	const pool = getPool();
	await pool.query(
		`UPDATE organizations SET status = $1, updated_at = now() WHERE id = $2::uuid`,
		[status, id]
	);
}

export async function getRestaurantBySlugRow(
	slug: string
): Promise<PlatformRestaurantDetailRow | null> {
	const pool = getPool();

	const { rows } = await pool.query<PlatformRestaurantDetailRow>(
		`
		SELECT
			r.id::text,
			r.name,
			r.slug,
			r.segment,
			o.id::text AS "organizationId",
			o.name AS "organizationName",
			o.slug AS "organizationSlug",
			r.status,
			COALESCE(r.location, '') AS location,
			COALESCE(r.default_language_tag, 'en') AS "defaultLanguageTag",
			COALESCE(r.timezone, 'Asia/Makassar') AS timezone,
			r.table_count AS "tableCount",
			r.created_at AS "createdAt"
		FROM restaurants r
		JOIN organizations o ON o.id = r.organization_id
		WHERE r.slug = $1
		`,
		[slug]
	);

	return rows[0] ?? null;
}

export type PlatformAnalyticsRow = {
	totalChatEvents: string;
	totalFallbacks: string;
	totalFeedback: string;
	helpfulFeedback: string;
	latencyP95: string | null;
	newOrganizations7d: string;
	newRestaurants7d: string;
};

/**
 * Aggregate platform-level AI metrics across ALL restaurants.
 * Runs as pool (no user context) — super admin reads bypass tenant RLS via migration 0010.
 */
export async function getPlatformAnalyticsRow(windowDays = 30): Promise<PlatformAnalyticsRow> {
	const pool = getPool();
	const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
	const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

	const [aiResult, fbResult, regResult] = await Promise.all([
		pool.query<{ total_chats: string; total_fallbacks: string; latency_p95: string | null }>(
			`
			SELECT
				COUNT(*) FILTER (WHERE event_type = 'chat')::text AS total_chats,
				COUNT(*) FILTER (
					WHERE event_type = 'chat'
						AND (safety_flags && ARRAY['needs-staff','blocked']::text[])
				)::text AS total_fallbacks,
				PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::text AS latency_p95
			FROM ai_events
			WHERE created_at >= $1::timestamptz
			`,
			[since]
		),
		pool.query<{ helpful_count: string; total_count: string }>(
			`
			SELECT
				COUNT(*) FILTER (WHERE helpful = true)::text AS helpful_count,
				COUNT(*)::text AS total_count
			FROM feedback
			WHERE created_at >= $1::timestamptz
			`,
			[since]
		),
		pool.query<{ new_orgs: string; new_restaurants: string }>(
			`
			SELECT
				(SELECT COUNT(*)::text FROM organizations WHERE created_at >= $1::timestamptz) AS new_orgs,
				(SELECT COUNT(*)::text FROM restaurants WHERE created_at >= $1::timestamptz) AS new_restaurants
			`,
			[since7d]
		)
	]);

	return {
		totalChatEvents: aiResult.rows[0]?.total_chats ?? '0',
		totalFallbacks: aiResult.rows[0]?.total_fallbacks ?? '0',
		latencyP95: aiResult.rows[0]?.latency_p95 ?? null,
		totalFeedback: fbResult.rows[0]?.total_count ?? '0',
		helpfulFeedback: fbResult.rows[0]?.helpful_count ?? '0',
		newOrganizations7d: regResult.rows[0]?.new_orgs ?? '0',
		newRestaurants7d: regResult.rows[0]?.new_restaurants ?? '0'
	};
}

export async function updateRestaurantStatus(
	id: string,
	status: 'active' | 'paused' | 'archived'
): Promise<void> {
	const pool = getPool();
	await pool.query(
		`UPDATE restaurants SET status = $1, updated_at = now() WHERE id = $2::uuid`,
		[status, id]
	);
}
