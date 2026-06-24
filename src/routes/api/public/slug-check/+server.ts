/**
 * GET /api/public/slug-check?slug=<value>&type=restaurant|organization
 *
 * Lightweight uniqueness check used during registration Step 2 to give
 * real-time feedback on slug availability before the form is submitted.
 *
 * Rate limit: 30 / 60 s per IP (form-assistance tier — low cost, no auth required).
 *
 * Response shape:
 *   200 { available: boolean, slug: string }
 *   400 { error: string }    (invalid slug format)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import {
	isRestaurantSlugAvailable,
	isOrganizationSlugAvailable
} from '$lib/server/repositories/onboarding-repository';
import { applyRateLimit } from '$lib/server/services/public-api-helpers';

const querySchema = z.object({
	slug: z
		.string()
		.min(2, 'Slug must be at least 2 characters.')
		.max(60, 'Slug must be at most 60 characters.')
		.regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens.'),
	type: z.enum(['restaurant', 'organization', 'both']).default('both')
});

export const GET: RequestHandler = async ({ url, request }) => {
	await applyRateLimit('slug-check', request);

	const parsed = querySchema.safeParse({
		slug: url.searchParams.get('slug')?.trim().toLowerCase(),
		type: url.searchParams.get('type') ?? 'both'
	});

	if (!parsed.success) {
		error(400, parsed.error.issues[0]?.message ?? 'Invalid slug.');
	}

	const { slug, type } = parsed.data;

	try {
		let available = true;

		if (type === 'restaurant' || type === 'both') {
			available = available && (await isRestaurantSlugAvailable(slug));
		}
		if ((type === 'organization' || type === 'both') && available) {
			available = available && (await isOrganizationSlugAvailable(slug));
		}

		return json(
			{ available, slug },
			{
				headers: {
					// Very short cache: slug availability changes when someone registers.
					// Browsers can reuse a response for 5 s; no shared cache.
					'Cache-Control': 'private, max-age=5'
				}
			}
		);
	} catch {
		// DB unavailable: fail open so registration isn't blocked.
		return json({ available: true, slug }, { status: 200 });
	}
};
