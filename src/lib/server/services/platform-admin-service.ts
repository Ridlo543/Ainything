import {
	listOrganizationsSchema,
	listRestaurantsSchema,
	updateOrgStatusSchema,
	updateRestaurantStatusSchema
} from '$lib/domain/platform/schema';
import {
	getOrganizationBySlugRow,
	getPlatformAnalyticsRow,
	getPlatformStatsRow,
	getRestaurantBySlugRow,
	listOrganizationsRows,
	listRestaurantsRows,
	updateOrganizationStatus,
	updateRestaurantStatus
} from '$lib/server/repositories/platform-repository';
import type { z } from 'zod';

export type PlatformOrganization = {
	id: string;
	name: string;
	slug: string;
	plan: string;
	status: string;
	restaurantCount: number;
	userCount: number;
	createdAt: string;
};

export type PlatformOrganizationDetail = PlatformOrganization & {
	workspaceHost: string;
};

export type PlatformRestaurant = {
	id: string;
	name: string;
	slug: string;
	segment: string;
	organizationName: string;
	status: string;
	tableCount: number;
	createdAt: string;
};

export type PlatformRestaurantDetail = PlatformRestaurant & {
	organizationId: string;
	organizationSlug: string;
	location: string;
	defaultLanguageTag: string;
	timezone: string;
};

export type PlatformStats = {
	totalOrganizations: number;
	totalRestaurants: number;
	platformUsers: number;
};

export class PlatformAdminInputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PlatformAdminInputError';
	}
}

export class PlatformAdminNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PlatformAdminNotFoundError';
	}
}

function parseListOptions(
	input: unknown,
	schema: z.ZodTypeAny,
	label: string
): { limit: number; offset: number; organizationId?: string } {
	const result = schema.safeParse(input);

	if (!result.success) {
		const issues = result.error.issues
			.map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`)
			.join(', ');
		throw new PlatformAdminInputError(`Invalid ${label}: ${issues}`);
	}

	return result.data as { limit: number; offset: number; organizationId?: string };
}

export async function getPlatformStats(): Promise<PlatformStats> {
	return getPlatformStatsRow();
}

export type PlatformAnalytics = {
	windowDays: number;
	totalChatEvents: number;
	totalFallbacks: number;
	fallbackRate: number;       // 0–100
	totalFeedback: number;
	helpfulFeedback: number;
	helpfulRate: number;        // 0–100
	latencyP95: number | null;  // ms
	newOrganizations7d: number;
	newRestaurants7d: number;
};

export async function getPlatformAnalytics(windowDays = 30): Promise<PlatformAnalytics> {
	const row = await getPlatformAnalyticsRow(windowDays);
	const toInt = (v: string | null) => Math.round(Number(v ?? 0));
	const toPercent = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

	const totalChatEvents = toInt(row.totalChatEvents);
	const totalFallbacks = toInt(row.totalFallbacks);
	const totalFeedback = toInt(row.totalFeedback);
	const helpfulFeedback = toInt(row.helpfulFeedback);

	return {
		windowDays,
		totalChatEvents,
		totalFallbacks,
		fallbackRate: toPercent(totalFallbacks, totalChatEvents),
		totalFeedback,
		helpfulFeedback,
		helpfulRate: toPercent(helpfulFeedback, totalFeedback),
		latencyP95: row.latencyP95 != null ? toInt(row.latencyP95) : null,
		newOrganizations7d: toInt(row.newOrganizations7d),
		newRestaurants7d: toInt(row.newRestaurants7d)
	};
}

export async function listOrganizations(opts?: {
	limit?: number;
	offset?: number;
	status?: string;
}): Promise<PlatformOrganization[]> {
	const parsed = parseListOptions(opts, listOrganizationsSchema, 'organization list') as {
		limit: number;
		offset: number;
		status?: string;
	};
	const { limit, offset, status } = parsed;

	const rows = await listOrganizationsRows({ limit, offset, status });

	return rows.map(
		(r: {
			id: string;
			name: string;
			slug: string;
			plan: string;
			status: string;
			restaurantCount: number | string;
			userCount: number | string;
			createdAt: string;
		}) => ({
			id: r.id,
			name: r.name,
			slug: r.slug,
			plan: r.plan,
			status: r.status,
			restaurantCount: Number(r.restaurantCount),
			userCount: Number(r.userCount),
			createdAt: r.createdAt
		})
	);
}

export async function getOrganizationDetail(
	slug: string
): Promise<PlatformOrganizationDetail> {
	const row = await getOrganizationBySlugRow(slug);
	if (!row) throw new PlatformAdminNotFoundError(`Organization '${slug}' not found`);
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		plan: row.plan,
		status: row.status,
		workspaceHost: row.workspaceHost,
		restaurantCount: Number(row.restaurantCount),
		userCount: Number(row.userCount),
		createdAt: row.createdAt
	};
}

export async function setOrganizationStatus(
	organizationId: string,
	status: 'active' | 'paused' | 'archived'
): Promise<void> {
	const result = updateOrgStatusSchema.safeParse({ organizationId, status });
	if (!result.success) {
		throw new PlatformAdminInputError(result.error.issues.map((i) => i.message).join(', '));
	}
	await updateOrganizationStatus(organizationId, status);
}

export async function listRestaurants(opts?: {
	limit?: number;
	offset?: number;
	organizationId?: string;
	status?: string;
}): Promise<PlatformRestaurant[]> {
	const parsed = parseListOptions(opts, listRestaurantsSchema, 'restaurant list') as {
		limit: number;
		offset: number;
		organizationId?: string;
		status?: string;
	};
	const { limit, offset, organizationId, status } = parsed;

	const rows = await listRestaurantsRows({ limit, offset, organizationId, status });

	return rows.map(
		(r: {
			id: string;
			name: string;
			slug: string;
			segment: string;
			organizationName: string;
			status: string;
			tableCount: number | string;
			createdAt: string;
		}) => ({
			id: r.id,
			name: r.name,
			slug: r.slug,
			segment: r.segment,
			organizationName: r.organizationName,
			status: r.status,
			tableCount: Number(r.tableCount),
			createdAt: r.createdAt
		})
	);
}

export async function getRestaurantDetail(
	slug: string
): Promise<PlatformRestaurantDetail> {
	const row = await getRestaurantBySlugRow(slug);
	if (!row) throw new PlatformAdminNotFoundError(`Restaurant '${slug}' not found`);
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		segment: row.segment,
		organizationId: row.organizationId,
		organizationName: row.organizationName,
		organizationSlug: row.organizationSlug,
		status: row.status,
		location: row.location,
		defaultLanguageTag: row.defaultLanguageTag,
		timezone: row.timezone,
		tableCount: Number(row.tableCount),
		createdAt: row.createdAt
	};
}

export async function setRestaurantStatus(
	restaurantId: string,
	status: 'active' | 'paused' | 'archived'
): Promise<void> {
	const result = updateRestaurantStatusSchema.safeParse({ restaurantId, status });
	if (!result.success) {
		throw new PlatformAdminInputError(result.error.issues.map((i) => i.message).join(', '));
	}
	await updateRestaurantStatus(restaurantId, status);
}
