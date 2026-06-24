import { z } from 'zod';

export const DEFAULT_PLATFORM_PAGE_SIZE = 50;
export const MAX_PLATFORM_PAGE_SIZE = 100;
export const MAX_PLATFORM_OFFSET = 10_000;

export const platformPaginationSchema = z.object({
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(MAX_PLATFORM_PAGE_SIZE)
		.default(DEFAULT_PLATFORM_PAGE_SIZE),
	offset: z.coerce.number().int().min(0).max(MAX_PLATFORM_OFFSET).default(0)
});

const PLATFORM_STATUS_FILTER = ['all', 'active', 'paused', 'archived'] as const;
export type PlatformStatusFilter = (typeof PLATFORM_STATUS_FILTER)[number];

export const listOrganizationsSchema = platformPaginationSchema.extend({
	status: z.enum(PLATFORM_STATUS_FILTER).default('all')
});

export const listRestaurantsSchema = platformPaginationSchema.extend({
	organizationId: z.string().uuid().optional(),
	status: z.enum(PLATFORM_STATUS_FILTER).default('all')
});

export const updateOrgStatusSchema = z.object({
	organizationId: z.string().uuid(),
	status: z.enum(['active', 'paused', 'archived'])
});

export const updateRestaurantStatusSchema = z.object({
	restaurantId: z.string().uuid(),
	status: z.enum(['active', 'paused', 'archived'])
});

export type PlatformPagination = z.infer<typeof platformPaginationSchema>;
export type ListOrganizationsInput = z.infer<typeof listOrganizationsSchema>;
export type ListRestaurantsInput = z.infer<typeof listRestaurantsSchema>;

export type UpdateOrgStatusInput = z.infer<typeof updateOrgStatusSchema>;
export type UpdateRestaurantStatusInput = z.infer<typeof updateRestaurantStatusSchema>;
