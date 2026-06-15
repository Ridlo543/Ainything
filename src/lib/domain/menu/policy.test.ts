import { describe, expect, it } from 'vitest';
import { restaurants } from '$lib/mock/restaurants';
import { formatPrice, needsStaffConfirmation, spiceLabel } from './policy';

describe('menu policy', () => {
	it('formats Indonesian rupiah without decimals', () => {
		expect(formatPrice(98000)).toBe('Rp98.000');
	});

	it('labels spice levels for customer-facing UI', () => {
		expect(spiceLabel(0)).toBe('No chili');
		expect(spiceLabel(2)).toBe('Mild');
		expect(spiceLabel(4)).toBe('Spicy');
		expect(spiceLabel(5)).toBe('Very spicy');
	});

	it('requires staff confirmation for allergen conflicts', () => {
		const seafoodItem = restaurants[0].menuItems.find((item) => item.allergens.includes('seafood'));

		expect(seafoodItem).toBeDefined();
		expect(needsStaffConfirmation(seafoodItem!, [], ['seafood'])).toBe(true);
	});

	it('requires staff confirmation for non-verified menu data', () => {
		const staffConfirmItem = restaurants[1].menuItems.find(
			(item) => item.confidence === 'staff-confirm'
		);

		expect(staffConfirmItem).toBeDefined();
		expect(needsStaffConfirmation(staffConfirmItem!, [], [])).toBe(true);
	});
});
