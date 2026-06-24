/**
 * POST /api/admin/embeddings
 *
 * Triggers embedding re-index for a restaurant's published menu items
 * and knowledge documents. Authenticated admin action only.
 *
 * Body: { restaurantSlug: string }
 * Response: { generated: number, skipped: number, embeddingEnabled: boolean }
 *
 * When EMBEDDING_ENABLED=false, the endpoint returns early with a flag
 * indicating embeddings are not configured.
 */

import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';
import { generateEmbeddingsForRestaurant } from '$lib/server/services/embedding-worker';
import { appEnv } from '$lib/server/config/env';
import { applyRateLimit } from '$lib/server/services/public-api-helpers';

const bodySchema = z.object({
	restaurantSlug: z.string().trim().min(1).max(120)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Authentication required.');
	}

	// Rate-limit: 10 per minute per user to prevent runaway embedding jobs
	await applyRateLimit('embeddings', request);

	let raw: unknown;

	try {
		raw = await request.json();
	} catch {
		error(400, 'Invalid JSON body.');
	}

	const parsed = bodySchema.safeParse(raw);

	if (!parsed.success) {
		error(400, 'Missing or invalid restaurant slug.');
	}

	const tenant = await resolveTenantContext(locals.user, parsed.data.restaurantSlug);
	const { activeRestaurant } = tenant;

	if (!appEnv.embeddingEnabled) {
		return json({
			generated: 0,
			skipped: 0,
			embeddingEnabled: false,
			message: 'Embedding is not enabled. Set EMBEDDING_ENABLED=true to use this feature.'
		});
	}

	const result = await generateEmbeddingsForRestaurant(activeRestaurant.id);

	return json({
		generated: result.generated,
		skipped: result.skipped,
		embeddingEnabled: true,
		message: `Re-indexed ${result.generated} item(s). ${result.skipped} skipped.`
	});
};
