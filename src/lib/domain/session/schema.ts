import { z } from 'zod';
import type { LanguageTag } from '$lib/domain/menu/types';
import { createSanitizePipe } from '$lib/domain/sanitize';

/**
 * Languages the platform accepts at the customer boundary. Kept in sync with
 * `LanguageTag` in `menu/types.ts`. The launch-facing subset is narrowed in product
 * docs (Phase 0), but the schema still accepts any known tag so precomputed-translation
 * work can expand coverage without a contract change.
 */
export const LANGUAGE_TAGS = [
	'en',
	'id',
	'zh-Hans',
	'ko',
	'ja',
	'ar',
	'hi',
	'fr',
	'de'
] as const satisfies readonly LanguageTag[];

export const DIETARY_PREFERENCE_CODES = [
	'halal',
	'vegetarian',
	'vegan',
	'gluten-free',
	'nut-free',
	'seafood-free',
	'low-spice'
] as const;

export type DietaryPreferenceCode = (typeof DIETARY_PREFERENCE_CODES)[number];

export const languageTagSchema = z.enum(LANGUAGE_TAGS);

/**
 * Guest preferences captured before recommendations. Tenant identity is NEVER part of
 * this payload: organization/restaurant/table are resolved server-side from the QR
 * bootstrap, never trusted from the client (see Technical_Specification "Anonymous
 * Guest-Write Trust Model").
 */
export const createSessionInputSchema = z.object({
	languageTag: languageTagSchema,
	dietaryPreferences: z.array(z.enum(DIETARY_PREFERENCE_CODES)).max(12).default([]),
	allergenNotes: z.string().max(280).pipe(createSanitizePipe(280)).optional()
});

export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

export type CustomerSessionPreferences = {
	dietaryPreferences: DietaryPreferenceCode[];
	allergenNotes?: string;
};

// ---------------------------------------------------------------------------
// Fallback request (guest calls for staff)
// ---------------------------------------------------------------------------

export const FALLBACK_PRIORITY_CODES = ['normal', 'high'] as const;
export type FallbackPriority = (typeof FALLBACK_PRIORITY_CODES)[number];

/**
 * Body sent by the guest when requesting human help.
 * Tenant scope and session ownership are resolved server-side; only the guest's
 * expressed need and the active language come from the request.
 */
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

// ---------------------------------------------------------------------------
// Feedback (guest rates the session)
// ---------------------------------------------------------------------------

export const FEEDBACK_ISSUE_TYPES = [
	'wrong-info',
	'missing-info',
	'too-slow',
	'language-problem',
	'other'
] as const;

export type FeedbackIssueType = (typeof FEEDBACK_ISSUE_TYPES)[number];

/**
 * Body sent by the guest for a quick post-session feedback.
 */
export const createFeedbackInputSchema = z.object({
	sessionId: z.string().uuid().optional(),
	helpful: z.boolean().optional(),
	issueType: z.enum(FEEDBACK_ISSUE_TYPES).optional(),
	comment: z.string().max(500).pipe(createSanitizePipe(500)).optional()
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackInputSchema>;

// ---------------------------------------------------------------------------
// Chat message
// ---------------------------------------------------------------------------

export const CHAT_ROLE_CODES = ['customer', 'assistant', 'staff', 'system'] as const;
export type ChatRole = (typeof CHAT_ROLE_CODES)[number];

export const CHAT_SAFETY_CODES = ['ok', 'low-confidence', 'needs-staff', 'blocked'] as const;
export type ChatSafetyStatus = (typeof CHAT_SAFETY_CODES)[number];

/**
 * Body sent by the guest to ask a question in the chat.
 * Tenant scope is always server-derived from the QR bootstrap + session token.
 */
export const createChatMessageInputSchema = z.object({
	sessionId: z.string().uuid(),
	content: z
		.string()
		.max(1000)
		.pipe(createSanitizePipe(1000))
		.refine((val) => val.length >= 1, { message: 'Chat message must not be empty' }),
	languageTag: languageTagSchema,
	/** Guest dietary preferences from the session — used to personalise the LLM context. */
	dietaryPreferences: z.array(z.enum(DIETARY_PREFERENCE_CODES)).max(12).default([])
});

export type CreateChatMessageInput = z.infer<typeof createChatMessageInputSchema>;
