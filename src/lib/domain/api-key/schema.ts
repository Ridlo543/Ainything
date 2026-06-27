import { z } from 'zod';

export const generateApiKeySchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.max(100, 'Name must be 100 characters or less')
		.trim(),
	expiresAt: z
		.string()
		.datetime({ message: 'Invalid date format' })
		.optional()
		.or(z.literal(''))
		.transform((v) => (v === '' ? undefined : v))
});

export const revokeApiKeySchema = z.object({
	id: z.string().uuid('Invalid key ID')
});

export type GenerateApiKeyInput = z.infer<typeof generateApiKeySchema>;
export type RevokeApiKeyInput = z.infer<typeof revokeApiKeySchema>;
