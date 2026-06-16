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
