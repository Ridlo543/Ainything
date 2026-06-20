/**
 * OCR import service — orchestrates menu image scanning and draft-menu import.
 *
 * This service is the bridge between the OCR provider adapter and the admin
 * menu repository. It handles:
 * 1. Running an OCR scan on an uploaded menu image
 * 2. Importing OCR-extracted items into the restaurant's draft menu
 * 3. Creating categories and inserting items with confidence='needs-review'
 *
 * All DB writes are scoped by organization_id + restaurant_id.
 */

import { getOcrProvider } from '$lib/server/providers/ocr/factory';
import type { OcrScanResult, OcrMenuItem } from '$lib/server/providers/ocr/types';
import type { MenuSourceType, LanguageTag, MenuItem, AppUser } from '$lib/domain/menu/types';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';
import { withUserContext } from '$lib/server/db/postgres';
import {
	loadMenusForRestaurant,
	ensureCategory,
	insertMenuItem
} from '$lib/server/repositories/admin-menu-repository';
import type { DatabaseClient } from '$lib/server/db/postgres';

/**
 * Runs an OCR scan on a base64-encoded menu image.
 * Returns structured items with per-field confidence scores for admin review.
 */
export async function scanMenuImage(input: {
	imageBase64: string;
	mimeType: string;
	sourceType: MenuSourceType;
	languageHints: LanguageTag[];
	restaurantName?: string;
}): Promise<OcrScanResult> {
	const provider = getOcrProvider();
	return provider.scan({
		imageBase64: input.imageBase64,
		mimeType: input.mimeType,
		sourceType: input.sourceType,
		languageHints: input.languageHints,
		restaurantName: input.restaurantName
	});
}

/**
 * Imports OCR-extracted items into the restaurant's draft menu.
 *
 * Steps:
 * 1. Resolves the tenant context for the authenticated user
 * 2. Finds or creates a draft menu for the restaurant
 * 3. For each OCR item: creates the category (if needed), inserts the item
 * 4. Stores OCR confidence scores in `source_metadata.ocr` for audit
 *
 * Returns the IDs of the created menu items.
 */
export async function importOcrItems(
	user: AppUser,
	input: {
		restaurantSlug: string;
		ocrResult: OcrScanResult;
	}
): Promise<MenuItem[]> {
	const tenant = await resolveTenantContext(user, input.restaurantSlug);
	const { activeRestaurant } = tenant;

	return withUserContext(user.id, async (client) => {
		// Find or create a draft menu.
		let draftMenuId: string;
		const existingMenus = await loadMenusForRestaurant(client, {
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id
		});
		const existingDraft = existingMenus.find((m) => m.status === 'draft');

		if (existingDraft) {
			draftMenuId = existingDraft.id;
		} else {
			// Create a new draft menu.
			const latestVersion = existingMenus.reduce((max, m) => Math.max(max, m.version), 0);
			const result = await client.query<{ id: string }>(
				`
					INSERT INTO menus (organization_id, restaurant_id, version, status, source_type)
					VALUES ($1::uuid, $2::uuid, $3, 'draft', $4)
					RETURNING id::text
				`,
				[
					activeRestaurant.organizationId,
					activeRestaurant.id,
					latestVersion + 1,
					input.ocrResult.items.length > 0 ? 'photo' : 'photo'
				]
			);
			draftMenuId = result.rows[0]!.id;
		}

		// Import each OCR item.
		const imported: MenuItem[] = [];
		for (let i = 0; i < input.ocrResult.items.length; i++) {
			const ocrItem = input.ocrResult.items[i]!;

			const categoryId = await ensureCategory(client, {
				organizationId: activeRestaurant.organizationId,
				restaurantId: activeRestaurant.id,
				menuId: draftMenuId,
				name: ocrItem.category
			});

			const menuItem = await insertMenuItem(client, {
				organizationId: activeRestaurant.organizationId,
				restaurantId: activeRestaurant.id,
				menuId: draftMenuId,
				categoryId,
				name: ocrItem.name,
				localName: ocrItem.localName,
				description: ocrItem.description,
				price: ocrItem.price,
				spiceLevel: Math.round(ocrItem.spiceLevel),
				isSignature: ocrItem.isSignature,
				dietaryFlags: ocrItem.dietaryFlags,
				allergens: ocrItem.allergens as string[],
				sourceMetadata: {
					ocr: {
						provider: input.ocrResult.provider,
						model: input.ocrResult.model,
						confidence: {
							name: ocrItem.nameConfidence,
							localName: ocrItem.localNameConfidence,
							category: ocrItem.categoryConfidence,
							description: ocrItem.descriptionConfidence,
							price: ocrItem.priceConfidence,
							spiceLevel: ocrItem.spiceLevelConfidence
						}
					}
				},
				sortOrder: i * 10
			});

			imported.push(menuItem);
		}

		return imported;
	});
}