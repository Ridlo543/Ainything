import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { resolvePublicMenu } from '$lib/server/tenant/public-context';
import { createFeedbackForSession } from '$lib/server/services/guest-interaction-service';
import { applyRateLimit, checkBodySize } from '$lib/server/services/public-api-helpers';

/**
 * POST /api/public/feedback
 *
 * Stores a guest's quick post-session feedback.
 * Rate limit: 10 / 60 s per session token (feedback tier).
 *
 * `restaurantSlug` + `tableCode` resolve tenant scope server-side.
 */
const bodySchema = z
	.object({
		restaurantSlug: z.string().trim().min(1).max(120),
		tableCode: z.string().trim().min(1).max(60)
	})
	.passthrough();

export const POST: RequestHandler = async ({ request }) => {
	await applyRateLimit('feedback', request);
	checkBodySize(request, 32_000);

	let raw: unknown;

	try {
		raw = await request.json();
	} catch {
		error(400, 'Invalid JSON body.');
	}

	const parsed = bodySchema.safeParse(raw);

	if (!parsed.success) {
		error(400, 'Missing or invalid restaurant/table identity.');
	}

	const bootstrap = await resolvePublicMenu(parsed.data.restaurantSlug, parsed.data.tableCode);

	if (!bootstrap) {
		error(404, 'Menu not found for this restaurant and table.');
	}

	let result;

	try {
		result = await createFeedbackForSession(bootstrap, raw);
	} catch (err) {
		if (err instanceof z.ZodError) {
			error(422, 'Invalid feedback payload.');
		}

		throw err;
	}

	return json({ feedbackId: result.feedbackId }, { status: 201 });
};
