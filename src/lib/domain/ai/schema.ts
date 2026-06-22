import { z } from 'zod';
import { languageTagSchema, DIETARY_PREFERENCE_CODES } from '$lib/domain/session/schema';
import { createSanitizePipe } from '$lib/domain/sanitize';

export const createChatMessageInputSchema = z.object({
	sessionId: z.string().uuid(),
	content: z
		.string()
		.max(1000)
		.pipe(createSanitizePipe(1000))
		.refine((val) => val.length >= 1, { message: 'Chat message must not be empty' }),
	languageTag: languageTagSchema,
	dietaryPreferences: z.array(z.enum(DIETARY_PREFERENCE_CODES)).max(12).default([])
});

export type CreateChatMessageInput = z.infer<typeof createChatMessageInputSchema>;
