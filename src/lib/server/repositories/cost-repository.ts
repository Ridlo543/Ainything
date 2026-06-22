import { query } from '$lib/server/db/postgres';

export type CostRow = {
	restaurant_id: string;
	model: string;
	calls: string;
	total_input_tokens: string;
	total_output_tokens: string;
};

export type RestaurantCostRow = {
	model: string;
	calls: string;
	total_input_tokens: string;
	total_output_tokens: string;
};

export async function getOrganizationCostRows(
	organizationId: string,
	daysBack: number
): Promise<CostRow[]> {
	try {
		const result = await query<CostRow>(
			`
			SELECT
				restaurant_id,
				COALESCE(model, 'unknown') AS model,
				COUNT(*)::text AS calls,
				COALESCE(SUM(input_tokens), 0)::text AS total_input_tokens,
				COALESCE(SUM(output_tokens), 0)::text AS total_output_tokens
			FROM ai_events
			WHERE
				organization_id = $1
				AND event_type = 'chat'
				AND created_at >= NOW() - ($2 || ' days')::INTERVAL
			GROUP BY restaurant_id, model
			ORDER BY restaurant_id, model
		`,
			[organizationId, String(daysBack)]
		);

		return result.rows;
	} catch (err) {
		console.error('[cost-repository] Failed to query ai_events', err);
		return [];
	}
}

export async function getRestaurantCostRows(
	restaurantId: string,
	daysBack: number
): Promise<RestaurantCostRow[]> {
	try {
		const result = await query<RestaurantCostRow>(
			`
			SELECT
				COALESCE(model, 'unknown') AS model,
				COUNT(*)::text AS calls,
				COALESCE(SUM(input_tokens), 0)::text AS total_input_tokens,
				COALESCE(SUM(output_tokens), 0)::text AS total_output_tokens
			FROM ai_events
			WHERE
				restaurant_id = $1
				AND event_type = 'chat'
				AND created_at >= NOW() - ($2 || ' days')::INTERVAL
			GROUP BY model
			ORDER BY model
		`,
			[restaurantId, String(daysBack)]
		);

		return result.rows;
	} catch (err) {
		console.error('[cost-repository] Failed to query ai_events for restaurant', err);
		return [];
	}
}
