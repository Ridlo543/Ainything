import type { OcrProvider, OcrScanInput, OcrScanResult, OcrMenuItem } from './types';
import type { MenuImportIssue } from '$lib/domain/menu/types';

const MOCK_ITEMS: OcrMenuItem[] = [
	{
		name: 'Nasi Goreng Kampung',
		nameConfidence: 0.94,
		localName: 'Village Fried Rice',
		localNameConfidence: 0.88,
		category: 'Mains',
		categoryConfidence: 0.96,
		description: 'Traditional fried rice with chicken, shrimp paste, and fried egg',
		descriptionConfidence: 0.85,
		price: 45000,
		priceConfidence: 0.92,
		currency: 'IDR',
		spiceLevel: 2,
		spiceLevelConfidence: 0.7,
		isSignature: true,
		dietaryFlags: ['spicy', 'seafood'],
		allergens: ['shellfish', 'egg', 'soy']
	},
	{
		name: 'Sate Ayam Madura',
		nameConfidence: 0.96,
		localName: 'Madura Chicken Satay',
		localNameConfidence: 0.9,
		category: 'Starters',
		categoryConfidence: 0.93,
		description: 'Grilled chicken skewers with peanut sauce and lontong rice cake',
		descriptionConfidence: 0.82,
		price: 38000,
		priceConfidence: 0.95,
		currency: 'IDR',
		spiceLevel: 1,
		spiceLevelConfidence: 0.65,
		isSignature: false,
		dietaryFlags: ['nut-free'],
		allergens: ['nuts', 'soy']
	},
	{
		name: 'Gado-Gado',
		nameConfidence: 0.97,
		localName: 'Indonesian Salad with Peanut Dressing',
		localNameConfidence: 0.86,
		category: 'Sides',
		categoryConfidence: 0.91,
		description: 'Steamed vegetables, tofu, tempeh with peanut sauce and emping crackers',
		descriptionConfidence: 0.79,
		price: 32000,
		priceConfidence: 0.93,
		currency: 'IDR',
		spiceLevel: 0,
		spiceLevelConfidence: 0.8,
		isSignature: false,
		dietaryFlags: ['vegetarian', 'vegan'],
		allergens: ['nuts', 'soy']
	},
	{
		name: 'Es Campur',
		nameConfidence: 0.92,
		localName: 'Mixed Ice Dessert',
		localNameConfidence: 0.84,
		category: 'Desserts',
		categoryConfidence: 0.95,
		description: 'Shaved ice with coconut milk, jackfruit, avocado, and condensed milk',
		descriptionConfidence: 0.77,
		price: 22000,
		priceConfidence: 0.91,
		currency: 'IDR',
		spiceLevel: 0,
		spiceLevelConfidence: 0.9,
		isSignature: false,
		dietaryFlags: ['vegetarian'],
		allergens: ['dairy']
	}
];

const MOCK_ISSUES: MenuImportIssue[] = [
	{
		id: 'ocr-issue-001',
		sourceType: 'photo',
		label: 'Price: Es Campur',
		confidence: 0.76,
		issue: 'Price partially obscured by glare in source photo. Verify against printed menu.',
		status: 'needs-review'
	}
];

const MOCK_RAW_TEXT = [
	'NASI GORENG KAMPUNG — Mains — 45,000',
	'Traditional fried rice with chicken, shrimp paste, and fried egg',
	'',
	'SATE AYAM MADURA — Starters — 38,000',
	'Grilled chicken skewers with peanut sauce and lontong rice cake',
	'',
	'GADO-GADO — Sides — 32,000',
	'Steamed vegetables, tofu, tempeh with peanut sauce and emping crackers',
	'',
	'ES CAMPUR — Desserts — 22,000',
	'Shaved ice with coconut milk, jackfruit, avocado, and condensed milk'
].join('\n');

/**
 * Mock OCR provider for local development and tests.
 *
 * Returns a deterministic fixture that looks like a real Indonesian restaurant menu
 * scan. Items have realistic confidence scores — some fields are lower confidence
 * (like spice level and description) to reflect real OCR behaviour.
 *
 * Includes one import issue (glare on a price) so the admin review flow can be
 * tested end-to-end.
 */
export class MockOcrProvider implements OcrProvider {
	async scan(_input: OcrScanInput): Promise<OcrScanResult> {
		void _input;
		return {
			items: MOCK_ITEMS,
			rawText: MOCK_RAW_TEXT,
			issues: MOCK_ISSUES,
			provider: 'mock',
			model: 'mock-ocr-v1',
			latencyMs: 0
		};
	}
}
