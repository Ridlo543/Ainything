/**
 * POST /api/public/chat/[roomId]/messages
 *
 * Buyer sends a message in their chat room.
 * Authenticated by public session ID cookie.
 */

import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { buyerSendMessageSchema } from '$lib/domain/chat/schema';
import { sendBuyerMessage } from '$lib/server/services/staff-chat-service';
import { SESSION_COOKIE } from '$lib/server/config/cookies';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const sessionId = cookies.get(SESSION_COOKIE);
	if (!sessionId) error(401, 'No session');

	const body = await request.json().catch(() => null);
	const parsed = buyerSendMessageSchema.safeParse({ ...body, sessionId });
	if (!parsed.success) error(400, parsed.error.issues[0]?.message ?? 'Invalid request');

	const msg = await sendBuyerMessage(sessionId, params.roomId, parsed.data.content);

	return json(msg, { status: 201 });
};
