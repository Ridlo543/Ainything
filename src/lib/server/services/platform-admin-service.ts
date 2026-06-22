import { listOrganizationsSchema, listRestaurantsSchema } from '$lib/domain/platform/schema';
import {
	getPlatformStatsRow,
	listOrganizationsRows,
	listRestaurantsRows
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

export async function listOrganizations(opts?: {
	limit?: number;
	offset?: number;
}): Promise<PlatformOrganization[]> {
	const { limit, offset } = parseListOptions(opts, listOrganizationsSchema, 'organization list');

	const rows = await listOrganizationsRows({ limit, offset });

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

export async function listRestaurants(opts?: {
	limit?: number;
	offset?: number;
	organizationId?: string;
}): Promise<PlatformRestaurant[]> {
	const { limit, offset, organizationId } = parseListOptions(
		opts,
		listRestaurantsSchema,
		'restaurant list'
	);

	const rows = await listRestaurantsRows({ limit, offset, organizationId });

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
