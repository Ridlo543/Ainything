import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	updateMenuItemInputSchema,
	toggleAvailabilityInputSchema,
	publishMenuInputSchema
} from '$lib/domain/menu/admin-schema';
import {
	editMenuItem,
	toggleAvailability,
	publishDraftMenu,
	MenuPublishValidationError
} from '$lib/server/services/menu-admin-service';

/**
 * Server load for the dashboard menu page.
 *
 * Reuses the layout's `data.tenant` (resolved from auth membership) for the
 * restaurant list and active restaurant. No additional DB reads needed — the
 * layout already loads published categories + items. The admin menu editor may
 * later switch to loading draft+published items; for now, published items are
 * sufficient for the edit form to pre-populate.
 */
export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	return { tenant };
};

export const actions: Actions = {
	/**
	 * Edit a menu item: update scalar columns + dietary/allergen flags.
	 *
	 * Progressive enhancement: works without JS (POST redirect) and with JS
	 * (use:enhance for optimistic UI). On Zod validation failure, returns
	 * structured errors via `fail(422, { validation })`.
	 */
	edit: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { message: 'Authentication required.' });
		}

		const formData = await request.formData();
		const raw = {
			itemId: String(formData.get('itemId') ?? ''),
			restaurant: String(formData.get('restaurant') ?? ''),
			name: String(formData.get('name') ?? ''),
			localName: formData.get('localName') ? String(formData.get('localName')) : undefined,
			description: String(formData.get('description') ?? ''),
			price: Number(formData.get('price') ?? 0),
			spiceLevel: Number(formData.get('spiceLevel') ?? 0),
			isAvailable: formData.get('isAvailable') === 'true',
			confidence: String(formData.get('confidence') ?? 'verified'),
			dietaryFlags: (formData.get('dietaryFlags') ?? '').toString().split(',').filter(Boolean),
			allergens: (formData.get('allergens') ?? '').toString().split(',').filter(Boolean)
		};

		const parsed = updateMenuItemInputSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(422, {
				validation: parsed.error.flatten().fieldErrors,
				message: 'Please fix the highlighted fields.'
			});
		}

		try {
			await editMenuItem(locals.user, {
				restaurantSlug: raw.restaurant,
				itemId: raw.itemId,
				input: parsed.data
			});
		} catch (err) {
			if (err instanceof MenuPublishValidationError) {
				// Not expected on edit, but handle gracefully.
				return fail(409, { message: err.message });
			}
			if (err instanceof Error) {
				return fail(500, { message: err.message });
			}
			return fail(500, { message: 'An unexpected error occurred.' });
		}

		// Redirect back to the menu page to re-render with fresh data.
		return { success: true };
	},

	/**
	 * Toggle item availability (sold-out / back in stock).
	 * Minimal payload — a fast path that avoids the full edit form.
	 */
	toggleAvailability: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { message: 'Authentication required.' });
		}

		const formData = await request.formData();
		const raw = {
			itemId: String(formData.get('itemId') ?? ''),
			restaurant: String(formData.get('restaurant') ?? ''),
			isAvailable: formData.get('isAvailable') === 'true'
		};

		const parsed = toggleAvailabilityInputSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(422, { message: 'Invalid toggle request.' });
		}

		try {
			await toggleAvailability(locals.user, {
				restaurantSlug: raw.restaurant,
				itemId: raw.itemId,
				isAvailable: parsed.data.isAvailable
			});
		} catch (err) {
			if (err instanceof Error) {
				return fail(500, { message: err.message });
			}
			return fail(500, { message: 'An unexpected error occurred.' });
		}

		return { success: true };
	},

	/**
	 * Publish the current draft menu.
	 * Runs the Data Quality Gate; returns blocking issues if the menu is not
	 * ready for publish.
	 */
	publish: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { message: 'Authentication required.' });
		}

		const formData = await request.formData();
		const raw = {
			restaurant: String(formData.get('restaurant') ?? '')
		};

		const parsed = publishMenuInputSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(422, { message: 'Invalid publish request.' });
		}

		try {
			const menuId = await publishDraftMenu(locals.user, {
				restaurantSlug: raw.restaurant
			});
			return { success: true, menuId };
		} catch (err) {
			if (err instanceof MenuPublishValidationError) {
				return fail(409, { publishIssues: err.validation.issues });
			}
			if (err instanceof Error) {
				return fail(500, { message: err.message });
			}
			return fail(500, { message: 'An unexpected error occurred.' });
		}
	}
};
