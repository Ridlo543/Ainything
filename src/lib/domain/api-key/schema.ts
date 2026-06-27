import { z } from 'zod';

export const generateApiKeySchema = z.object({
	name: z
		.string()
		.min(1, 'Name is required')
		.max(100, 'Name must be 100 characters or less')
		.trim(),
	// datetime-local input produces 'YYYY-MM-DDTHH:mm' (no seconds, no timezone).
	// z.string().datetime() rejects this format, so we pre-process into a full ISO string
	// by appending ':00.000Z' when the value is a non-empty local datetime string.
	expiresAt: z.preprocess(
		(val) => {
			if (typeof val !== 'string' || val === '') return undefined;
			// Already a full ISO string (e.g. from API call) — pass through
			if (/Z$/.test(val) || /[+-]\d{2}:\d{2}$/.test(val)) return val;
			// datetime-local format 'YYYY-MM-DDTHH:mm' or 'YYYY-MM-DDTHH:mm:ss' — treat as UTC
			return val + (val.length === 16 ? ':00.000Z' : '.000Z');
		},
		z.string().datetime({ message: 'Invalid expiry date' }).optional()
	)
});

export const revokeApiKeySchema = z.object({
	id: z.string().uuid('Invalid key ID')
});

export type GenerateApiKeyInput = z.infer<typeof generateApiKeySchema>;
export type RevokeApiKeyInput = z.infer<typeof revokeApiKeySchema>;
