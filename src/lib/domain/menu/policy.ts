import type { Allergen, DietaryFlag, MenuItem } from './types';

export function needsStaffConfirmation(
	item: MenuItem,
	preferences: DietaryFlag[],
	allergens: Allergen[]
) {
	const hasAllergenConflict = allergens.some((allergen) => item.allergens.includes(allergen));
	const hasDietaryConflict = preferences.some(
		(flag) => flag === 'halal' && item.dietaryFlags.includes('contains-alcohol')
	);

	return item.confidence !== 'verified' || hasAllergenConflict || hasDietaryConflict;
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
