import { z } from 'zod';
import { createSanitizePipe } from '$lib/domain/sanitize';
import { FEEDBACK_ISSUE_TYPES, MAX_COMMENT_LENGTH } from './policy';

export const createFeedbackInputSchema = z.object({
	sessionId: z.string().uuid().optional(),
	helpful: z.boolean().optional(),
	issueType: z.enum(FEEDBACK_ISSUE_TYPES).optional(),
	comment: z
		.string()
		.max(MAX_COMMENT_LENGTH)
		.pipe(createSanitizePipe(MAX_COMMENT_LENGTH))
		.optional()
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackInputSchema>;
