/**
 * Registration Step 2 — Restaurant details.
 *
 * Shown after email verification when the authenticated user has no membership yet.
 * Provisions the organization + restaurant + membership in a single transaction.
 */

import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { findAppUserByExternalId } from '$lib/server/repositories/user-repository';
import {
	provisionOrganizationAndRestaurant,
	slugify,
	isRestaurantSlugAvailable,
	isOrganizationSlugAvailable
} from '$lib/server/repositories/onboarding-repository';
import { tryProvisionSubdomain } from '$lib/server/services/subdomain-service';

const SEGMENTS = ['cafe', 'casual-dining', 'hotel-restaurant', 'beach-club', 'premium'] as const;

const setupSchema = z.object({
	restaurantName: z.string().min(1, 'Restaurant name is required.').max(100),
	restaurantSlug: z
		.string()
		.min(2, 'Slug must be at least 2 characters.')
		.max(60)
		.regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens.'),
	segment: z.enum(SEGMENTS, { message: 'Select a restaurant type.' }),
	timezone: z.string().min(1, 'Timezone is required.'),
	defaultLanguageTag: z.string().min(2, 'Default language is required.'),
	location: z.string().max(100).default('')
});

export const load: PageServerLoad = async ({ locals }) => {
	// Must be authenticated
	if (!locals.user) {
		redirect(303, '/login');
	}

	// If user already has a membership, skip setup
	if (locals.user.memberships.length > 0) {
		redirect(303, '/dashboard');
	}

	// Pre-fill restaurant name from user metadata if available
	return {
		suggestedSlug: '',
		user: { name: locals.user.name, email: locals.user.email }
	};
};

export const actions: Actions = {
	setup: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(303, '/login');
		}

		if (locals.user.memberships.length > 0) {
			redirect(303, '/dashboard');
		}

		const formData = await request.formData();
		const raw = {
			restaurantName: formData.get('restaurantName'),
			restaurantSlug: formData.get('restaurantSlug'),
			segment: formData.get('segment'),
			timezone: formData.get('timezone'),
			defaultLanguageTag: formData.get('defaultLanguageTag'),
			location: formData.get('location') ?? ''
		};

		const parsed = setupSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(422, {
				message: parsed.error.issues[0]?.message ?? 'Invalid input.',
				...raw
			});
		}

		const { restaurantName, restaurantSlug, segment, timezone, defaultLanguageTag, location } =
			parsed.data;

		// Slug uniqueness check
		const [slugAvail, orgSlugAvail] = await Promise.all([
			isRestaurantSlugAvailable(restaurantSlug),
			isOrganizationSlugAvailable(restaurantSlug)
		]);

		if (!slugAvail || !orgSlugAvail) {
			return fail(422, {
				message: 'That URL slug is already taken. Please choose a different one.',
				...raw
			});
		}

		// Resolve app_users.id from external_auth_id
		const appUser = await findAppUserByExternalId(locals.user.id);
		if (!appUser) {
			return fail(503, { message: 'Your account profile is not ready. Please try again.' });
		}

		try {
			const { organizationId } = await provisionOrganizationAndRestaurant({
				appUserId: appUser.id,
				organizationName: restaurantName,
				organizationSlug: slugify(restaurantName),
				restaurantName,
				restaurantSlug,
				segment,
				timezone,
				defaultLanguageTag,
				location: String(location)
			});
			// Provision workspace_host non-blocking — failure never blocks sign-up
			await tryProvisionSubdomain(organizationId);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Setup failed. Please try again.';
			// Friendly slug-conflict message
			if (message.includes('duplicate key') || message.includes('unique')) {
				return fail(422, {
					message: 'That URL slug is already taken. Please choose a different one.',
					...raw
				});
			}
			return fail(500, { message, ...raw });
		}

		redirect(303, '/dashboard');
	},

	suggestSlug: async ({ request }) => {
		const formData = await request.formData();
		const name = String(formData.get('restaurantName') ?? '');
		return { suggestedSlug: slugify(name) };
	}
};
