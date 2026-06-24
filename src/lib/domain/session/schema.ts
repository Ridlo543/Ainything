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
