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

export const listOrganizationsSchema = platformPaginationSchema;

export const listRestaurantsSchema = platformPaginationSchema.extend({
	organizationId: z.string().uuid().optional()
});

export type PlatformPagination = z.infer<typeof platformPaginationSchema>;
export type ListOrganizationsInput = z.infer<typeof listOrganizationsSchema>;
export type ListRestaurantsInput = z.infer<typeof listRestaurantsSchema>;
