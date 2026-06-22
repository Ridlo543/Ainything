import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { resolvePublicMenu } from '$lib/server/tenant/public-context';
import { handleChatTurn } from '$lib/server/services/chat-service';
import { applyRateLimit, checkBodySize } from '$lib/server/services/public-api-helpers';
import { checkDailyAiCap } from '$lib/server/services/ai-cost-cap';

/**
 * POST /api/public/chat
 *
 * Handles a single chat turn: validates input, enforces rate limit and daily AI cap,
 * calls the LLM adapter, persists the turn, and returns the answer.
 * Rate limit: 20 / 60 s per session token (chat tier).
 *
 * `restaurantSlug` + `tableCode` resolve the tenant server-side. `sessionId` must be
 * a valid UUID previously issued by POST /api/public/sessions.
 */
const bodySchema = z
	.object({
		restaurantSlug: z.string().trim().min(1).max(120),
		tableCode: z.string().trim().min(1).max(60)
	})
	.passthrough();

export const POST: RequestHandler = async ({ request }) => {
	await applyRateLimit('chat', request);
	checkBodySize(request);

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

	// Per-restaurant daily AI-call cap check (Phase 6d / item 3).
	const capResult = await checkDailyAiCap(bootstrap.table.restaurantId);

	if (!capResult.allowed) {
		return json(
			{
				answer:
					'Our assistant has reached its daily limit. Please ask our staff for help — they will be happy to assist you.',
				safetyStatus: 'needs-staff',
				suggestFallback: true,
				capExceeded: true
			},
			{ status: 200 }
		);
	}

	let result;

	try {
		result = await handleChatTurn(bootstrap, raw);
	} catch (err) {
		if (err instanceof z.ZodError) {
			error(422, 'Invalid chat message payload.');
		}

		throw err;
	}

	return json(
		{
			customerMessageId: result.customerMessageId,
			assistantMessageId: result.assistantMessageId,
			answer: result.answer,
			safetyStatus: result.safetyStatus,
			suggestFallback: result.suggestFallback,
			capExceeded: false
		},
		{ status: 201 }
	);
};
