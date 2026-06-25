import type { PageServerLoad } from './$types';
import { getPool } from '$lib/server/db/postgres';

export type BillingStats = {
	totalOrganizations: number;
	byPlan: { plan: string; count: number }[];
	mrr: number;
};

export const load: PageServerLoad = async () => {
	const pool = getPool();

	const [totalResult, planResult] = await Promise.all([
		pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM organizations`),
		pool.query<{ plan: string; count: string }>(
			`SELECT plan, COUNT(*)::text AS count FROM organizations GROUP BY plan ORDER BY plan`
		)
	]);

	const byPlan = planResult.rows.map((r) => ({
		plan: r.plan,
		count: Number(r.count)
	}));

	const planPrices: Record<string, number> = {
		pilot: 0,
		starter: 99000,
		pro: 299000,
		enterprise: 999000
	};

	const mrr = byPlan.reduce((sum, r) => sum + (planPrices[r.plan] ?? 0) * r.count, 0);

	const stats: BillingStats = {
		totalOrganizations: Number(totalResult.rows[0]?.count ?? 0),
		byPlan,
		mrr
	};

	return {
		stats
	};
};
