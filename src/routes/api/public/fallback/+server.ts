import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { resolvePublicCatalogMenu } from '$lib/server/tenant/public-context';
import { createFallbackForTable } from '$lib/server/services/guest-interaction-service';
import { applyRateLimit, checkBodySize } from '$lib/server/services/public-api-helpers';

/**
 * POST /api/public/fallback
 *
 * Creates a staff fallback request from a guest at a QR table.
 * Rate limit: 5 / 60 s per session token (fallback tier).
 *
 * `restaurantSlug` + `tableCode` resolve tenant scope server-side; the body carries
 * only the guest's expressed need, language, and optional session id.
 */
const bodySchema = z
	.object({
		restaurantSlug: z.string().trim().min(1).max(120),
		tableCode: z.string().trim().min(1).max(60)
	})
	.passthrough();

export const POST: RequestHandler = async ({ request }) => {
	await applyRateLimit('fallback', request);
	checkBodySize(request, 64_000);

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

	const bootstrap = await resolvePublicCatalogMenu(parsed.data.restaurantSlug, parsed.data.tableCode);

	if (!bootstrap) {
		error(404, 'Menu not found for this restaurant and table.');
	}

	let result;

	try {
		result = await createFallbackForTable(bootstrap, raw);
	} catch (err) {
		if (err instanceof z.ZodError) {
			error(422, 'Invalid fallback request payload.');
		}

		throw err;
	}

	return json({ fallbackId: result.fallbackId, status: result.status }, { status: 201 });
};
