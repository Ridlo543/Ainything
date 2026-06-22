import { z } from 'zod';
import { languageTagSchema } from '$lib/domain/session/schema';
import { createSanitizePipe } from '$lib/domain/sanitize';
import { FALLBACK_PRIORITY_CODES } from './policy';

export const createFallbackInputSchema = z.object({
	sessionId: z.string().uuid().optional(),
	languageTag: languageTagSchema,
	guestNeed: z
		.string()
		.max(500)
		.pipe(createSanitizePipe(500))
		.refine((val) => val.length >= 1, { message: 'Guest need must not be empty' }),
	summary: z.string().max(1000).pipe(createSanitizePipe(1000)).default(''),
	priority: z.enum(FALLBACK_PRIORITY_CODES).default('normal')
});

export type CreateFallbackInput = z.infer<typeof createFallbackInputSchema>;

export const listRequestsInputSchema = z.object({
	userId: z.string().min(1),
	organizationId: z.string().min(1),
	restaurantIds: z.array(z.string().min(1)).min(1)
});

export const transitionStatusInputSchema = z.object({
	userId: z.string().min(1),
	requestId: z.string().uuid(),
	restaurantId: z.string().uuid(),
	newStatus: z.enum(['in-progress', 'resolved'])
});
