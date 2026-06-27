/**
 * GET /api/chat/[roomId]/stream
 *
 * Staff-side SSE endpoint. Requires an authenticated staff session.
 * Streams chat messages for the given fallback_request room.
 */

import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { createChatSSEStream } from '$lib/server/services/staff-chat-service';
import { getRoomContext } from '$lib/server/repositories/staff-chat-repository';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) error(401, 'Unauthorized');

	const { roomId } = params;

	// Validate the room exists and belongs to the staff member's organization
	const ctx = await getRoomContext(roomId);
	if (!ctx) error(404, 'Chat room not found');

	const membership = user.memberships.find((m) => m.organizationId === ctx.organizationId);
	if (!membership) error(403, 'Access denied');

	const stream = createChatSSEStream(roomId);

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no' // Disable Nginx buffering for SSE
		}
	});
};
