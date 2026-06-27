/**
 * GET /api/public/chat/[roomId]/stream
 *
 * Buyer-side SSE endpoint. Authenticated by public session ID cookie.
 * Streams chat messages for the buyer's fallback_request room.
 */

import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { createChatSSEStream } from '$lib/server/services/staff-chat-service';
import { verifyBuyerOwnsRoom } from '$lib/server/repositories/staff-chat-repository';
import { SESSION_COOKIE } from '$lib/server/config/cookies';

export const GET: RequestHandler = async ({ params, cookies }) => {
	const sessionId = cookies.get(SESSION_COOKIE);
	if (!sessionId) error(401, 'No session');

	const { roomId } = params;

	// Verify the requesting session owns this room before opening the stream.
	// verifyBuyerOwnsRoom JOINs buyer_sessions to compare public_session_id —
	// a direct UUID comparison against ctx.buyerSessionId would always fail.
	const owns = await verifyBuyerOwnsRoom(roomId, sessionId);
	if (!owns) error(403, 'Access denied');

	const stream = createChatSSEStream(roomId);

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};
