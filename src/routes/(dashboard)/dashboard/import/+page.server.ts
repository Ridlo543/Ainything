import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';
import { scanMenuImage, importOcrItems } from '$lib/server/services/ocr-import-service';

const MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

const SOURCE_TYPES = [
	'photo',
	'pdf-scan',
	'bilingual',
	'handwritten',
	'seasonal',
	'spreadsheet'
] as const;

const scanInputSchema = z.object({
	image: z.string().min(10, 'Please upload a menu image.'),
	mimeType: z.enum(MIME_TYPES, { message: 'Invalid image format. Use PNG, JPEG, or WebP.' }),
	sourceType: z.enum(SOURCE_TYPES),
	restaurant: z.string().min(1, 'Restaurant is required.').max(120)
});

const importInputSchema = z.object({
	restaurant: z.string().min(1).max(120),
	scan: z.string().min(1, 'No OCR scan data to import.')
});

/**
 * Server load for the dashboard import page.
 *
 * The layout already resolves `data.tenant` from the authenticated membership.
 * No additional DB reads needed — the page handles upload + review interactively.
 */
export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	return { tenant };
};

export const actions: Actions = {
	/**
	 * Upload a menu image and run OCR scanning.
	 *
	 * Accepts a base64-encoded image via form data. Returns the OCR scan result
	 * with structured items and per-field confidence scores for admin review.
	 */
scan: async ({ locals, request }) => {
			if (!locals.user) {
				return fail(401, { message: 'Authentication required.' });
			}

			const formData = await request.formData();
			const parseResult = scanInputSchema.safeParse({
				image: formData.get('image'),
				mimeType: formData.get('mimeType'),
				sourceType: formData.get('sourceType'),
				restaurant: formData.get('restaurant')
			});

			if (!parseResult.success) {
				return fail(422, { message: parseResult.error.issues[0]?.message ?? 'Invalid input.' });
			}

			const { image: imageBase64, mimeType, sourceType, restaurant } = parseResult.data;

		try {
			const result = await scanMenuImage({
				imageBase64,
				mimeType,
				sourceType,
				languageHints: ['en', 'id'],
				restaurantName: restaurant
			});

			return {
				scan: {
					items: result.items.map((item) => ({
						name: item.name,
						nameConfidence: item.nameConfidence,
						localName: item.localName,
						localNameConfidence: item.localNameConfidence,
						category: item.category,
						categoryConfidence: item.categoryConfidence,
						description: item.description,
						descriptionConfidence: item.descriptionConfidence,
						price: item.price,
						priceConfidence: item.priceConfidence,
						currency: item.currency,
						spiceLevel: item.spiceLevel,
						spiceLevelConfidence: item.spiceLevelConfidence,
						isSignature: item.isSignature,
						dietaryFlags: item.dietaryFlags,
						allergens: item.allergens
					})),
					rawText: result.rawText,
					issues: result.issues,
					provider: result.provider,
					model: result.model
				}
			};
		} catch (err) {
			if (err instanceof Error) {
				return fail(500, { message: err.message });
			}
			return fail(500, { message: 'OCR scan failed.' });
		}
	},

	/**
	 * Import approved OCR items into the restaurant's draft menu.
	 *
	 * Expects the full OcrScanResult JSON in the form body so the server
	 * can re-import without the client needing to keep the scan in session.
	 */
	import: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { message: 'Authentication required.' });
		}

		const formData = await request.formData();
		const parseResult = importInputSchema.safeParse({
			restaurant: formData.get('restaurant'),
			scan: formData.get('scan')
		});

		if (!parseResult.success) {
			return fail(422, { message: parseResult.error.issues[0]?.message ?? 'Invalid input.' });
		}

		const { restaurant, scan: scanJson } = parseResult.data;

		let scanResult;
		try {
			scanResult = JSON.parse(scanJson);
		} catch {
			return fail(422, { message: 'Invalid OCR scan data.' });
		}

		if (!scanResult.items || !Array.isArray(scanResult.items) || scanResult.items.length === 0) {
			return fail(422, { message: 'No items to import.' });
		}

		try {
			const imported = await importOcrItems(locals.user, {
				restaurantSlug: restaurant,
				ocrResult: {
					items: scanResult.items,
					rawText: scanResult.rawText ?? '',
					issues: scanResult.issues ?? [],
					provider: scanResult.provider ?? 'mock',
					model: scanResult.model ?? 'mock-ocr-v1',
					latencyMs: 0
				}
			});

			return {
				imported: {
					count: imported.length,
					items: imported.map((item) => ({
						id: item.id,
						name: item.name,
						category: item.category
					}))
				}
			};
		} catch (err) {
			if (err instanceof Error) {
				return fail(500, { message: err.message });
			}
			return fail(500, { message: 'Failed to import items.' });
		}
	}
};