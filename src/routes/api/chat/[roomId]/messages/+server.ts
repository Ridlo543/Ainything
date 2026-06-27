/**
 * POST /api/chat/[roomId]/messages
 *
 * Staff sends a message in a chat room.
 * Requires an authenticated staff session (locals.user).
 */

import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { staffSendMessageSchema } from '$lib/domain/chat/schema';
import { sendStaffReply } from '$lib/server/services/staff-chat-service';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user;
	if (!user) error(401, 'Unauthorized');

	const body = await request.json().catch(() => null);
	const parsed = staffSendMessageSchema.safeParse(body);
	if (!parsed.success) error(400, parsed.error.issues[0]?.message ?? 'Invalid request');

	const msg = await sendStaffReply(user, params.roomId, parsed.data.content);

	return json(msg, { status: 201 });
};
