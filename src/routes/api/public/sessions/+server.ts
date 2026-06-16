import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { resolvePublicMenu } from '$lib/server/tenant/public-context';
import { createCustomerSessionForTable } from '$lib/server/services/customer-session-service';
import { applyRateLimit } from '$lib/server/services/public-api-helpers';

/**
 * POST /api/public/sessions
 *
 * Creates an anonymous customer session for a QR table.
 * Rate limit: 5 / 60 s per IP (session-create tier).
 *
 * `restaurantSlug` + `tableCode` are public identifiers used to resolve tenant scope
 * server-side; the body never carries organization/restaurant/table ids directly (see
 * Technical_Specification "Anonymous Guest-Write Trust Model").
 */
const bodySchema = z
	.object({
		restaurantSlug: z.string().trim().min(1).max(120),
		tableCode: z.string().trim().min(1).max(60)
	})
	.passthrough();

export const POST: RequestHandler = async ({ request }) => {
	await applyRateLimit('session-create', request);

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
		result = await createCustomerSessionForTable(bootstrap, raw);
	} catch (err) {
		if (err instanceof z.ZodError) {
			error(422, 'Invalid session preferences.');
		}

		throw err;
	}

	return json(
		{
			sessionId: result.sessionId,
			languageTag: result.languageTag,
			preferences: result.preferences
		},
		{ status: 201 }
	);
};
