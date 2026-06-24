/**
 * Service layer for admin/manager menu operations.
 *
 * Orchestrates domain validation, tenant resolution, and repository calls.
 * Every write runs inside `withUserContext` so the 0006 RLS policies evaluate
 * against the authenticated membership.
 *
 * Tenant scope (organizationId, restaurantId) is ALWAYS derived from the
 * server-side `TenantContext` — never from the request body. The body carries
 * a `restaurant` slug only to pick the active scope, which is re-validated
 * against the membership.
 */

import type { AuthUser } from '$lib/domain/auth/types';
import type { UpdateMenuItemInput } from '$lib/domain/menu/admin-schema';
import { canPublishMenu, type PublishValidation } from '$lib/domain/menu/policy';
import { withUserContext } from '$lib/server/db/postgres';
import {
	findMenuItemById,
	loadMenusForRestaurant,
	loadMenuItemsForMenu,
	countMenuItems,
	updateMenuItem as repoUpdateMenuItem,
	setMenuItemAvailability as repoSetAvailability,
	updateMenuItemFlags as repoUpdateFlags,
	publishMenu as repoPublishMenu
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
 * Updates a menu item's scalar columns and flags in a single transaction.
 *
 * Steps:
 *  1. Resolve tenant context from the authenticated user + slug.
 *  2. Open a user-scoped transaction (sets app.user_external_id for RLS).
 *  3. Update scalar columns (name, price, spice, availability, confidence).
 *  4. Replace dietary flags and allergens (delete-then-insert).
 *  5. Re-read the item with flags to return the full MenuItem.
 *
 * Throws if the item does not exist or the caller lacks access (RLS).
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
		const updated = await repoUpdateMenuItem(client, {
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id,
			itemId,
			name: input.name,
			localName: input.localName,
			description: input.description,
			price: input.price,
			spiceLevel: input.spiceLevel,
			isAvailable: input.isAvailable,
			confidence: input.confidence
		});

		if (!updated) {
			throw new Error(`Menu item ${itemId} not found or access denied.`);
		}

		// Update dietary flags and allergens in the same transaction.
		await repoUpdateFlags(client, {
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id,
			itemId,
			dietaryFlags: input.dietaryFlags,
			allergens: input.allergens
		});

		// Re-read to get the full item with flags after the update.
		const full = await findMenuItemById(client, {
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id,
			itemId
		});

		if (!full) {
			throw new Error(`Menu item ${itemId} disappeared after update — this should not happen.`);
		}

		return full;
	});
}

/**
 * Fast path for toggling item availability (sold-out / back in stock).
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
		const success = await repoSetAvailability(client, {
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id,
			itemId,
			isAvailable
		});

		if (!success) {
			throw new Error(`Menu item ${itemId} not found or access denied.`);
		}
	});
}

// ---------------------------------------------------------------------------
// Publish operations
// ---------------------------------------------------------------------------

/**
 * Validates and publishes the current draft menu for a restaurant.
 *
 * Steps:
 *  1. Resolve tenant context.
 *  2. Load menus for the restaurant.
 *  3. Find the latest draft menu (if none, throw).
 *  4. Load all items for the draft menu.
 *  5. Run the Data Quality Gate (`canPublishMenu`).
 *  6. If blocking issues exist, throw `MenuPublishValidationError`.
 *  7. Open a transaction: archive published menu, promote draft.
 *  8. Return the newly published menu id.
 */
export async function publishDraftMenu(
	user: AuthUser,
	{ restaurantSlug }: { restaurantSlug: string }
): Promise<string> {
	const tenant = await resolveTenantContext(user, restaurantSlug);
	const { activeRestaurant } = tenant;

	const publishedId = await withUserContext(user.id, async (client) => {
		// Load menu records for this restaurant.
		const menus = await loadMenusForRestaurant(client, {
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id
		});

		// Find the latest draft menu.
		const draft = menus.find((m) => m.status === 'draft');
		if (!draft) {
			throw new Error(`No draft menu found for restaurant ${activeRestaurant.slug}.`);
		}

		// Check item count — a menu with zero items should not be published.
		const itemCount = await countMenuItems(client, {
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id,
			menuId: draft.id
		});
		if (itemCount === 0) {
			throw new MenuPublishValidationError({
				ok: false,
				issues: [
					{
						itemId: '',
						itemName: '(menu)',
						issues: ['The draft menu has no items. Add items before publishing.']
					}
				]
			});
		}

		// Load items from the draft menu and run the Data Quality Gate.
		const draftItems = await loadMenuItemsForMenu(client, {
			menuId: draft.id,
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id
		});
		const validation = canPublishMenu(draftItems);
		if (!validation.ok) {
			throw new MenuPublishValidationError(validation);
		}

		// Archive published, promote draft.
		const publishedId = await repoPublishMenu(client, {
			organizationId: activeRestaurant.organizationId,
			restaurantId: activeRestaurant.id,
			menuId: draft.id
		});

		if (!publishedId) {
			throw new Error(`Failed to publish menu for restaurant ${activeRestaurant.slug}.`);
		}

		return publishedId;
	});

	// Fire-and-forget embedding generation after publish.
	// Only runs when EMBEDDING_ENABLED=true; errors are logged but never propagate.
	// Uses BullMQ queue so processing happens asynchronously outside the HTTP request.
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
 * Runs the Data Quality Gate against a set of menu items without publishing.
 * Used by the dashboard to show publish-readiness warnings before the admin
 * commits to a publish.
 */
export function validateMenuForPublish(items: MenuItem[]): PublishValidation {
	return canPublishMenu(items);
}
