import type { Allergen, DietaryFlag, MenuItem } from './types';

/**
 * Returns true when the guest should be directed to ask staff before ordering.
 *
 * Triggers on:
 * - Item confidence is not 'verified' (OCR/import data not confirmed by restaurant).
 * - Guest has an allergen that appears in the item's allergen list.
 * - Guest dietary preference conflicts with item flags:
 *   - halal: item contains alcohol
 *   - vegetarian: item is not tagged vegetarian or vegan
 *   - vegan: item is not tagged vegan
 *   - gluten-free: item allergens include gluten
 *   - nut-free: item allergens include nuts
 *   - contains-alcohol: guest avoids alcohol, item contains it
 */
export function needsStaffConfirmation(
	item: MenuItem,
	preferences: DietaryFlag[],
	allergens: Allergen[]
): boolean {
	if (item.confidence !== 'verified') return true;

	// Allergen conflict — any guest allergen present in item
	if (allergens.some((a) => item.allergens.includes(a))) return true;

	for (const pref of preferences) {
		switch (pref) {
			case 'halal':
				if (item.dietaryFlags.includes('contains-alcohol')) return true;
				if (!item.dietaryFlags.includes('halal')) return true;
				break;
			case 'vegetarian':
				if (!item.dietaryFlags.includes('vegetarian') && !item.dietaryFlags.includes('vegan'))
					return true;
				break;
			case 'vegan':
				if (!item.dietaryFlags.includes('vegan')) return true;
				break;
			case 'gluten-free':
				if (item.allergens.includes('gluten')) return true;
				break;
			case 'nut-free':
				if (item.allergens.includes('nuts')) return true;
				break;
			case 'contains-alcohol':
				// Guest selected "No alcohol" preference
				if (item.dietaryFlags.includes('contains-alcohol')) return true;
				break;
		}
	}

	return false;
}

export function formatPrice(value: number, currency: 'IDR' = 'IDR') {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency,
		maximumFractionDigits: 0
	})
		.format(value)
		.replace(/\s+/g, '');
}

export function spiceLabel(level: MenuItem['spiceLevel']) {
	if (level === 0) return 'No chili';
	if (level <= 2) return 'Mild';
	if (level <= 4) return 'Spicy';
	return 'Very spicy';
}

// ---------------------------------------------------------------------------
// Publish Data Quality Gate (PRD section 9 "Data Quality Gate")
//
// A menu may go live only when every item carries the minimum verified
// information a guest needs to order with confidence. Restaurants remain the
// single source of truth for allergy/halal flags — the gate surfaces missing
// data to the admin before publish rather than guessing on the guest's behalf.
// ---------------------------------------------------------------------------

export type PublishItemIssue = {
	itemId: string;
	itemName: string;
	issues: string[];
};

export type PublishValidation = {
	ok: boolean;
	issues: PublishItemIssue[];
};

/** Codes that mark an item as carrying allergy/diet risk if left unverified. */
const RISK_DIETARY_FLAGS: ReadonlySet<DietaryFlag> = new Set([
	'contains-alcohol',
	'seafood',
	'halal'
]);

/**
 * Validates a single item against the publish gate.
 *
 * Blocking conditions (publish refused):
 * - Missing or empty name.
 * - Negative price (the DB CHECK already rejects < 0, but guard anyway).
 *
 * Warning conditions (publish allowed, item flagged "needs staff confirmation"
 * at guest time, never silently answered by the AI):
 * - confidence is not 'verified' AND the item carries risk flags or allergens.
 *   These are surfaced so the admin can verify them before going live, but they
 *   are not blockers — a restaurant may intentionally ship an item as
 *   `staff-confirm` while awaiting certification.
 */
export function validateMenuItemForPublish(item: MenuItem): string[] {
	const issues: string[] = [];

	if (!item.name || item.name.trim().length === 0) {
		issues.push('Item name is required.');
	}
	if (item.price < 0) {
		issues.push('Price cannot be negative.');
	}

	// Risk items must be explicitly verified before going live; if they are not,
	// the admin is told but the publish is not blocked (the item is auto-flagged
	// "needs staff confirmation" for guests via `needsStaffConfirmation`).
	const hasRiskFlag = item.dietaryFlags.some((flag) => RISK_DIETARY_FLAGS.has(flag));
	const hasAllergen = item.allergens.length > 0;

	if (item.confidence !== 'verified' && (hasRiskFlag || hasAllergen)) {
		issues.push(
			'Allergy/dietary data is not verified — guests will be asked to confirm with staff.'
		);
	}

	return issues;
}

/**
 * Validates a whole menu for publish. Returns `ok: true` only when no item has
 * blocking issues. Non-blocking warnings are still collected so the dashboard
 * can show them before the admin confirms.
 */
export function canPublishMenu(items: MenuItem[]): PublishValidation {
	const issues = items
		.map((item) => {
			const itemIssues = validateMenuItemForPublish(item);
			return itemIssues.length === 0
				? null
				: { itemId: item.id, itemName: item.name, issues: itemIssues };
		})
		.filter((entry): entry is PublishItemIssue => entry !== null);

	const blocking = issues.filter((entry) =>
		entry.issues.some((msg) => msg.includes('required') || msg.includes('negative'))
	);

	return { ok: blocking.length === 0, issues };
}
