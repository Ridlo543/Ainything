import { describe, expect, it } from 'vitest';
import { restaurants } from '$lib/mock/restaurants';
import {
	formatPrice,
	needsStaffConfirmation,
	spiceLabel,
	canPublishMenu,
	validateMenuItemForPublish
} from './policy';
import type { MenuItem } from './types';

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

	// ── Publish Data Quality Gate ────────────────────────────────────────────

	const verifiedItem: MenuItem = {
		id: 'verified-1',
		category: 'Main',
		name: 'Nasi Goreng',
		localName: 'Fried Rice',
		description: 'Classic fried rice',
		price: 35000,
		currency: 'IDR',
		image: '',
		spiceLevel: 2,
		isAvailable: true,
		isSignature: false,
		dietaryFlags: [],
		allergens: [],
		goodFor: [],
		confidence: 'verified'
	};

	const unnamedItem: MenuItem = { ...verifiedItem, id: 'unnamed-1', name: '' };
	const negativePriceItem: MenuItem = { ...verifiedItem, id: 'neg-1', price: -1000 };
	const unverifiedRiskItem: MenuItem = {
		...verifiedItem,
		id: 'unv-risk-1',
		confidence: 'needs-review',
		dietaryFlags: ['halal'],
		allergens: ['seafood']
	};

	it('allows a verified menu with all clean items to publish', () => {
		const result = canPublishMenu([verifiedItem, verifiedItem]);
		expect(result.ok).toBe(true);
		expect(result.issues).toHaveLength(0);
	});

	it('blocks publish when any item has an empty name', () => {
		const result = canPublishMenu([verifiedItem, unnamedItem]);
		expect(result.ok).toBe(false);
		expect(result.issues.some((i) => i.itemId === 'unnamed-1')).toBe(true);
	});

	it('blocks publish when any item has a negative price', () => {
		const result = canPublishMenu([verifiedItem, negativePriceItem]);
		expect(result.ok).toBe(false);
		expect(result.issues.some((i) => i.itemId === 'neg-1')).toBe(true);
	});

	it('allows publish with unverified risk items (warning only, not blocking)', () => {
		const result = canPublishMenu([verifiedItem, unverifiedRiskItem]);
		expect(result.ok).toBe(true);
		expect(result.issues.some((i) => i.itemId === 'unv-risk-1')).toBe(true);
	});

	it('flags unverified items with risk flags or allergens as needing staff confirmation', () => {
		const issues = validateMenuItemForPublish(unverifiedRiskItem);
		expect(issues.length).toBeGreaterThan(0);
		expect(issues.some((msg) => msg.includes('Allergy/dietary'))).toBe(true);
	});
});
