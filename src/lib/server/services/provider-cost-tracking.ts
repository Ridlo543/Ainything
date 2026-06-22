import {
	getOrganizationCostRows,
	getRestaurantCostRows
} from '$lib/server/repositories/cost-repository';

type ModelPricing = {
	inputPerMillion: number;
	outputPerMillion: number;
};

const MODEL_PRICING: Record<string, ModelPricing> = {
	'MiniMax-M3': { inputPerMillion: 0, outputPerMillion: 0 },
	'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
	'gpt-4o': { inputPerMillion: 5.0, outputPerMillion: 15.0 },
	'claude-haiku-4-5': { inputPerMillion: 0.8, outputPerMillion: 4.0 },
	'claude-sonnet-4': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
	'text-embedding-3-small': { inputPerMillion: 0.02, outputPerMillion: 0 },
	'text-embedding-3-large': { inputPerMillion: 0.13, outputPerMillion: 0 }
};

export type CostBreakdown = {
	restaurantId: string;
	totalCostUsd: number;
	calls: number;
	inputTokens: number;
	outputTokens: number;
	byModel: Array<{
		model: string;
		costUsd: number;
		calls: number;
		inputTokens: number;
		outputTokens: number;
	}>;
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
	const pricing = MODEL_PRICING[model];
	if (!pricing) return 0;
	return (
		(inputTokens / 1_000_000) * pricing.inputPerMillion +
		(outputTokens / 1_000_000) * pricing.outputPerMillion
	);
}

export async function getOrganizationCosts(
	organizationId: string,
	daysBack: number = 30
): Promise<CostBreakdown[]> {
	const rows = await getOrganizationCostRows(organizationId, daysBack);

	const byRestaurant = new Map<string, CostBreakdown>();

	for (const row of rows) {
		const calls = Number(row.calls);
		const inputTokens = Number(row.total_input_tokens);
		const outputTokens = Number(row.total_output_tokens);
		const costUsd = calculateCost(row.model, inputTokens, outputTokens);

		let breakdown = byRestaurant.get(row.restaurant_id);
		if (!breakdown) {
			breakdown = {
				restaurantId: row.restaurant_id,
				totalCostUsd: 0,
				calls: 0,
				inputTokens: 0,
				outputTokens: 0,
				byModel: []
			};
			byRestaurant.set(row.restaurant_id, breakdown);
		}

		breakdown.totalCostUsd = Number((breakdown.totalCostUsd + costUsd).toFixed(6));
		breakdown.calls += calls;
		breakdown.inputTokens += inputTokens;
		breakdown.outputTokens += outputTokens;
		breakdown.byModel.push({ model: row.model, costUsd, calls, inputTokens, outputTokens });
	}

	return [...byRestaurant.values()];
}

export async function getRestaurantCosts(
	restaurantId: string,
	daysBack: number = 30
): Promise<CostBreakdown | null> {
	const rows = await getRestaurantCostRows(restaurantId, daysBack);

	if (!rows.length) return null;

	const breakdown: CostBreakdown = {
		restaurantId,
		totalCostUsd: 0,
		calls: 0,
		inputTokens: 0,
		outputTokens: 0,
		byModel: []
	};

	for (const row of rows) {
		const calls = Number(row.calls);
		const inputTokens = Number(row.total_input_tokens);
		const outputTokens = Number(row.total_output_tokens);
		const costUsd = calculateCost(row.model, inputTokens, outputTokens);

		breakdown.totalCostUsd = Number((breakdown.totalCostUsd + costUsd).toFixed(6));
		breakdown.calls += calls;
		breakdown.inputTokens += inputTokens;
		breakdown.outputTokens += outputTokens;
		breakdown.byModel.push({ model: row.model, costUsd, calls, inputTokens, outputTokens });
	}

	return breakdown;
}
