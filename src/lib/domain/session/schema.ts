import { z } from 'zod';
import type { LanguageTag } from '$lib/domain/menu/types';

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
	allergenNotes: z.string().trim().max(280).optional()
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
	guestNeed: z.string().trim().min(1).max(500),
	summary: z.string().trim().max(1000).default(''),
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
	comment: z.string().trim().max(500).optional()
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackInputSchema>;
