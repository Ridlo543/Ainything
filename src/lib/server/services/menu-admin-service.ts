/**
 * Service layer for admin/manager catalog operations.
 *
 * Orchestrates domain validation, tenant resolution, and repository calls.
 * Every write runs inside `withUserContext` so RLS policies evaluate
 * against the authenticated membership.
 *
 * Tenant scope (organizationId, outletId) is ALWAYS derived from the
 * server-side `TenantContext` — never from the request body. The body carries
 * an `outlet` slug only to pick the active scope, which is re-validated
 * against the membership.
 */

import type { AuthUser } from '$lib/domain/auth/types';
import type { UpdateMenuItemInput } from '$lib/domain/menu/admin-schema';
import { canPublishMenu, type PublishValidation } from '$lib/domain/menu/policy';
import { withUserContext } from '$lib/server/db/postgres';
import {
	getProductById,
	loadCatalogsForOutlet,
	loadProductsForCatalog,
	createProduct,
	updateProduct,
	setProductAvailability,
	updateProductFlags,
	publishCatalog,
	ensureCategory,
	createDraftMenu,
	productToMenuItem
} from '$lib/server/repositories/admin-menu-repository';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';
import { appEnv } from '$lib/server/config/env';
import type { MenuItem } from '$lib/domain/menu/types';

// ---------------------------------------------------------------------------
// Custom error types
// ---------------------------------------------------------------------------

export class MenuPublishValidationError extends Error {
	constructor(public readonly validation: PublishValidation) {
		super(`Publish blocked: ${validation.issues.length} item(s) have issues.`);
		this.name = 'MenuPublishValidationError';
	}
}

// ---------------------------------------------------------------------------
// Edit operations
// ---------------------------------------------------------------------------

/**
 * Updates a product's scalar columns and flags in a single transaction.
 *
 * Steps:
 *  1. Resolve tenant context from the authenticated user + slug.
 *  2. Open a user-scoped transaction (sets app.user_external_id for RLS).
 *  3. Update scalar columns (name, price, availability, confidence).
 *  4. Replace dietary flags and allergens (delete-then-insert).
 *  5. Re-read the product with flags to return the full MenuItem.
 *
 * Throws if the product does not exist or the caller lacks access (RLS).
 */
export async function editMenuItem(
	user: AuthUser,
	{
		restaurantSlug,
		itemId,
		input
	}: { restaurantSlug: string; itemId: string; input: UpdateMenuItemInput }
): Promise<MenuItem> {
	const tenant = await resolveTenantContext(user, restaurantSlug);
	const { activeRestaurant } = tenant;

	return withUserContext(user.id, async (client) => {
		const updated = await updateProduct(client, {
			organizationId: activeRestaurant.organizationId,
			outletId: activeRestaurant.id,
			productId: itemId,
			data: {
				name: input.name,
				localName: input.localName ?? null,
				description: input.description,
				priceAmount: input.price,
				isAvailable: input.isAvailable,
				confidence: input.confidence,
				...(input.spiceLevel !== undefined ? { spiceLevel: input.spiceLevel } : {})
			}
		});

		if (!updated) {
			throw new Error(`Product ${itemId} not found or access denied.`);
		}

		// Replace dietary flags and allergens in the same transaction.
		await updateProductFlags(client, {
			organizationId: activeRestaurant.organizationId,
			outletId: activeRestaurant.id,
			productId: itemId,
			dietaryFlags: input.dietaryFlags,
			allergens: input.allergens
		});

		// Re-read to get the full product with flags after the update.
		const full = await getProductById(client, {
			organizationId: activeRestaurant.organizationId,
			outletId: activeRestaurant.id,
			productId: itemId
		});

		if (!full) {
			throw new Error(`Product ${itemId} disappeared after update — this should not happen.`);
		}

		return productToMenuItem(full);
	});
}

/**
 * Fast path for toggling product availability (sold-out / back in stock).
 * Only touches `is_available`; does not re-read flags or metadata.
 */
export async function toggleAvailability(
	user: AuthUser,
	{
		restaurantSlug,
		itemId,
		isAvailable
	}: { restaurantSlug: string; itemId: string; isAvailable: boolean }
): Promise<void> {
	const tenant = await resolveTenantContext(user, restaurantSlug);
	const { activeRestaurant } = tenant;

	await withUserContext(user.id, async (client) => {
		const success = await setProductAvailability(client, {
			organizationId: activeRestaurant.organizationId,
			outletId: activeRestaurant.id,
			productId: itemId,
			isAvailable
		});

		if (!success) {
			throw new Error(`Product ${itemId} not found or access denied.`);
		}
	});
}

// ---------------------------------------------------------------------------
// Publish operations
// ---------------------------------------------------------------------------

/**
 * Validates and publishes the current draft catalog for an outlet.
 *
 * Steps:
 *  1. Resolve tenant context.
 *  2. Load catalogs for the outlet.
 *  3. Find the latest draft catalog (if none, throw).
 *  4. Load all products for the draft catalog.
 *  5. Run the Data Quality Gate (`canPublishMenu`).
 *  6. If blocking issues exist, throw `MenuPublishValidationError`.
 *  7. Open a transaction: archive published catalog, promote draft.
 *  8. Return the newly published catalog id.
 */
export async function publishDraftMenu(
	user: AuthUser,
	{ restaurantSlug }: { restaurantSlug: string }
): Promise<string> {
	const tenant = await resolveTenantContext(user, restaurantSlug);
	const { activeRestaurant } = tenant;

	const publishedId = await withUserContext(user.id, async (client) => {
		// Load catalog records for this outlet.
		const catalogs = await loadCatalogsForOutlet(client, {
			organizationId: activeRestaurant.organizationId,
			outletId: activeRestaurant.id
		});

		// Find the latest draft catalog.
		const draft = catalogs.find((c) => c.status === 'draft');
		if (!draft) {
			throw new Error(`No draft catalog found for outlet ${activeRestaurant.slug}.`);
		}

		// Load products from the draft catalog and run the Data Quality Gate.
		const draftProducts = await loadProductsForCatalog(client, {
			catalogId: draft.id,
			organizationId: activeRestaurant.organizationId,
			outletId: activeRestaurant.id
		});

		if (draftProducts.length === 0) {
			throw new MenuPublishValidationError({
				ok: false,
				issues: [
					{
						itemId: '',
						itemName: '(catalog)',
						issues: ['The draft catalog has no products. Add products before publishing.']
					}
				]
			});
		}

		const validation = canPublishMenu(draftProducts.map(productToMenuItem));
		if (!validation.ok) {
			throw new MenuPublishValidationError(validation);
		}

		// Archive published, promote draft.
		const newPublishedId = await publishCatalog(client, {
			organizationId: activeRestaurant.organizationId,
			outletId: activeRestaurant.id,
			catalogId: draft.id
		});

		if (!newPublishedId) {
			throw new Error(`Failed to publish catalog for outlet ${activeRestaurant.slug}.`);
		}

		return newPublishedId;
	});

	// Fire-and-forget embedding generation after publish.
	// Only runs when EMBEDDING_ENABLED=true; errors are logged but never propagate.
	if (appEnv.embeddingEnabled) {
		import('$lib/server/queue/embedding-queue')
			.then(({ enqueueEmbeddingJob }) => enqueueEmbeddingJob(activeRestaurant.id))
			.catch((err) => {
				console.error(
					`[menu-admin-service] Failed to enqueue embedding job for ${activeRestaurant.id}:`,
					err
				);
			});
	}

	return publishedId;
}

/**
 * Runs the Data Quality Gate against a set of products without publishing.
 * Used by the dashboard to show publish-readiness warnings before the admin
 * commits to a publish.
 */
export function validateMenuForPublish(items: MenuItem[]): PublishValidation {
	return canPublishMenu(items);
}

// ---------------------------------------------------------------------------
// Add single product (setup wizard / manual add)
// ---------------------------------------------------------------------------

/**
 * Adds a single product during onboarding or manual product creation.
 * Automatically finds or creates a draft catalog.
 */
export async function addMenuItem(
	user: AuthUser,
	{
		restaurantSlug,
		name,
		price,
		category,
		description
	}: {
		restaurantSlug: string;
		name: string;
		price: number;
		category: string;
		description?: string;
	}
): Promise<MenuItem> {
	const tenant = await resolveTenantContext(user, restaurantSlug);
	const { activeRestaurant } = tenant;

	return withUserContext(user.id, async (client) => {
		const existingCatalogs = await loadCatalogsForOutlet(client, {
			organizationId: activeRestaurant.organizationId,
			outletId: activeRestaurant.id
		});
		const existingDraft = existingCatalogs.find((c) => c.status === 'draft');

		let draftCatalogId: string;
		if (existingDraft) {
			draftCatalogId = existingDraft.id;
		} else {
			const latestVersion = existingCatalogs.reduce((max, c) => Math.max(max, c.version ?? 0), 0);
			draftCatalogId = await createDraftMenu(client, {
				organizationId: activeRestaurant.organizationId,
				restaurantId: activeRestaurant.id,
				version: latestVersion + 1,
				sourceType: 'manual'
			});
		}

		const sectionId = await ensureCategory(client, {
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id,
			menuId: draftCatalogId,
			name: category
		});

		const product = await createProduct(client, {
			organizationId: activeRestaurant.organizationId,
			outletId: activeRestaurant.id,
			catalogId: draftCatalogId,
			sectionId,
			data: {
				name,
				description: description ?? '',
				priceAmount: price,
				isAvailable: true,
				isSignature: false,
				confidence: 'needs-review'
			}
		});

		if (!product) {
			throw new Error(`Failed to create product "${name}".`);
		}

		return productToMenuItem(product);
	});
}
