export type PlanTier = 'free' | 'starter' | 'pro';

export type UsageLimits = {
	maxRestaurants: number;
	maxMenuItemsPerRestaurant: number;
	maxKnowledgeDocsPerRestaurant: number;
	maxAiCallsPerDay: number;
	maxStorageMb: number;
};

const PLAN_LIMITS: Record<PlanTier, UsageLimits> = {
	free: {
		maxRestaurants: 1,
		maxMenuItemsPerRestaurant: 50,
		maxKnowledgeDocsPerRestaurant: 10,
		maxAiCallsPerDay: 30,
		maxStorageMb: 10
	},
	starter: {
		maxRestaurants: 3,
		maxMenuItemsPerRestaurant: 200,
		maxKnowledgeDocsPerRestaurant: 50,
		maxAiCallsPerDay: 500,
		maxStorageMb: 100
	},
	pro: {
		maxRestaurants: 20,
		maxMenuItemsPerRestaurant: 1000,
		maxKnowledgeDocsPerRestaurant: 200,
		maxAiCallsPerDay: 5000,
		maxStorageMb: 1000
	}
};

export function getLimitsForTier(tier: PlanTier): UsageLimits {
	return PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;
}

export type LimitCheck = {
	allowed: boolean;
	reason?: string;
	current: number;
	limit: number;
};

export function checkLimit(current: number, limit: number, label: string): LimitCheck {
	const allowed = current < limit;
	return {
		allowed,
		reason: allowed ? undefined : `${label} limit reached (${current}/${limit})`,
		current,
		limit
	};
}
