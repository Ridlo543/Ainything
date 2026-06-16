import { z } from 'zod';
import type { Allergen, DietaryFlag } from './types';

/**
 * Zod schemas for admin/manager menu edits.
 *
 * Conventions follow `domain/session/schema.ts`: closed string unions via
 * `z.enum(...)` on a shared `as const` array, string fields trimmed and bounded,
 * and tenant identity deliberately absent from the payload. organization_id /
 * restaurant_id / menu_item_id are resolved server-side from the authenticated
 * membership and the URL/context, never trusted from the client form.
 *
 * The accepted code sets are aligned with the DB CHECK constraints and FK
 * references in `db/migrations/0001_core_multi_tenant_schema.sql`:
 *   - menu_items.confidence IN ('verified','needs-review','staff-confirm')
 *   - menu_items.spice_level BETWEEN 0 AND 5
 *   - menu_items.price_amount >= 0 (integer rupiah, no decimals)
 *   - menu_item_dietary_flags.flag_code REFERENCES dietary_flags(code)
 *   - menu_item_allergens.allergen_code REFERENCES allergens(code)
 */

export const MENU_CONFIDENCE_CODES = ['verified', 'needs-review', 'staff-confirm'] as const;
export type MenuConfidenceCode = (typeof MENU_CONFIDENCE_CODES)[number];

export const MENU_DIETARY_FLAG_CODES = [
	'halal',
	'vegetarian',
	'vegan',
	'gluten-free',
	'contains-alcohol',
	'spicy',
	'seafood',
	'nut-free'
] as const satisfies readonly DietaryFlag[];

export const MENU_ALLERGEN_CODES = [
	'nuts',
	'dairy',
	'egg',
	'shellfish',
	'seafood',
	'soy',
	'gluten',
	'sesame'
] as const satisfies readonly Allergen[];

/**
 * Body for the `edit` form action on the dashboard menu page.
 *
 * `itemId` + `restaurant` (slug) come from the form so progressive enhancement
 * works without JS, but the restaurant is re-resolved against the authenticated
 * membership server-side — the body value is only used to pick the active scope,
 * never trusted as authorization.
 */
export const updateMenuItemInputSchema = z.object({
	itemId: z.string().uuid(),
	restaurant: z.string().trim().min(1).max(120),
	name: z.string().trim().min(1).max(200),
	localName: z.string().trim().max(200).optional(),
	description: z.string().trim().max(1000).default(''),
	price: z.number().int().min(0).max(10_000_000),
	spiceLevel: z.number().int().min(0).max(5),
	isAvailable: z.boolean(),
	confidence: z.enum(MENU_CONFIDENCE_CODES),
	dietaryFlags: z.array(z.enum(MENU_DIETARY_FLAG_CODES)).max(20).default([]),
	allergens: z.array(z.enum(MENU_ALLERGEN_CODES)).max(20).default([])
});

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemInputSchema>;

/**
 * Body for the `toggleAvailability` form action — a fast path for the sold-out
 * toggle that avoids re-sending the full item edit.
 */
export const toggleAvailabilityInputSchema = z.object({
	itemId: z.string().uuid(),
	restaurant: z.string().trim().min(1).max(120),
	isAvailable: z.boolean()
});

export type ToggleAvailabilityInput = z.infer<typeof toggleAvailabilityInputSchema>;

/**
 * Body for the `publish` form action. Only the restaurant slug is carried; the
 * menu is resolved server-side from the active restaurant's menus.
 */
export const publishMenuInputSchema = z.object({
	restaurant: z.string().trim().min(1).max(120)
});

export type PublishMenuInput = z.infer<typeof publishMenuInputSchema>;
