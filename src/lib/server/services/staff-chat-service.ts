/**
 * Staff chat service — coordinates staff↔buyer real-time messaging.
 *
 * Transport: SSE (Server-Sent Events) over Redis pub/sub.
 * Channel naming: `chat:{fallbackRequestId}`
 *
 * Every message is:
 * 1. Validated (Zod schema + access check)
 * 2. Persisted to chat_messages (append-only, tenant-scoped)
 * 3. Published to Redis so all SSE subscribers receive it instantly
 *
 * If Redis is unavailable, messages are still persisted — only the
 * real-time push degrades gracefully. The SSE heartbeat (every 25s)
 * keeps the connection alive; clients reconnect automatically on drop.
 */

import { error } from '@sveltejs/kit';
import {
	insertStaffMessage,
	insertBuyerMessage,
	getMessagesByRoom,
	getRoomContext,
	getBuyerRoomContext
} from '$lib/server/repositories/staff-chat-repository';
import { getRedisClient } from '$lib/server/cache/redis';
import { appEnv } from '$lib/server/config/env';
import type { AuthUser } from '$lib/domain/auth/types';
import type { StaffChatMessage, ChatMessageEvent } from '$lib/domain/chat/types';

// ---------------------------------------------------------------------------
// Redis helpers
// ---------------------------------------------------------------------------

export function chatChannel(roomId: string): string {
	return `chat:${roomId}`;
}

/**
 * Publish a chat message event to the Redis channel for a room.
 * Failures are caught and logged — never allowed to break the message-send path.
 */
async function publishChatEvent(roomId: string, msg: StaffChatMessage): Promise<void> {
	if (!appEnv.redisUrl) return;

	try {
		const redis = await getRedisClient();
		const event: ChatMessageEvent = {
			type: 'message',
			id: msg.id,
			roomId: msg.roomId,
			role: msg.role,
			content: msg.content,
			senderName: msg.senderName,
			createdAt: msg.createdAt
		};
		await redis.publish(chatChannel(roomId), JSON.stringify(event));
	} catch (err) {
		console.error('[staff-chat-service] Redis publish failed:', err);
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load recent message history for a room.
 * Access is validated by confirming the room exists; caller is responsible
 * for verifying that the requesting party has access to the room first.
 */
export async function getChatHistory(roomId: string): Promise<StaffChatMessage[]> {
	const ctx = await getRoomContext(roomId);
	if (!ctx) error(404, 'Room not found');
	return getMessagesByRoom(roomId, 50);
}

/**
 * Staff sends a message in a chat room.
 *
 * @param user    - authenticated AuthUser from locals.user
 * @param roomId  - fallback_request.id (the chat room)
 * @param content - message text (pre-validated by Zod at route layer)
 */
export async function sendStaffReply(
	user: AuthUser,
	roomId: string,
	content: string
): Promise<StaffChatMessage> {
	// Validate room access — the room must belong to one of the staff's outlets
	const ctx = await getRoomContext(roomId);
	if (!ctx) error(404, 'Chat room not found');

	const membership = user.memberships.find((m) => m.organizationId === ctx.organizationId);
	if (!membership) error(403, 'Access denied');
	if (!membership.outletIds.includes(ctx.outletId)) error(403, 'Access denied');

	// user.id is the app_users.id — used for withUserContext RLS and sender_id
	const msg = await insertStaffMessage(
		roomId,
		user.id,
		user.id,
		content,
		ctx.organizationId,
		ctx.outletId
	);

	await publishChatEvent(roomId, msg);
	return msg;
}

/**
 * Buyer sends a message in their chat room.
 *
 * @param sessionId - buyer's public_session_id (cookie value)
 * @param roomId    - fallback_request.id the buyer owns
 * @param content   - message text
 */
export async function sendBuyerMessage(
	sessionId: string,
	roomId: string,
	content: string
): Promise<StaffChatMessage> {
	// Single query: validates session ownership AND returns org/outlet context.
	// Replaces the previous two-query pattern (getRoomContext + verifyBuyerOwnsRoom).
	const ctx = await getBuyerRoomContext(roomId, sessionId);
	if (!ctx) error(403, 'Access denied');

	const msg = await insertBuyerMessage(
		roomId,
		sessionId,
		content,
		ctx.organizationId,
		ctx.outletId
	);

	await publishChatEvent(roomId, msg);
	return msg;
}

/**
 * Creates a ReadableStream that emits Server-Sent Events for a chat room.
 *
 * The stream:
 * - Sends all existing messages as an initial `history` event
 * - Subscribes to Redis `chat:{roomId}` channel for live messages
 * - Emits a `heartbeat` event every 25s to keep the connection alive
 * - Gracefully unsubscribes and cleans up on client disconnect
 *
 * If Redis is unavailable the stream only sends the history + heartbeats;
 * the client should fall back to polling in that case.
 */
export function createChatSSEStream(roomId: string): ReadableStream {
	return new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			function send(event: string, data: unknown) {
				const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
				try {
					controller.enqueue(encoder.encode(payload));
				} catch {
					// Connection already closed — ignore
				}
			}

			// 1. Send existing history so client doesn't need a separate fetch
			try {
				const history = await getMessagesByRoom(roomId, 50);
				send('history', history);
			} catch (err) {
				console.error('[chat-sse] Failed to load history:', err);
				send('history', []);
			}

			// 2. Subscribe to Redis for live events
			let subscriber: Awaited<ReturnType<typeof getRedisClient>> | null = null;

			if (appEnv.redisUrl) {
				try {
					// Create a dedicated subscriber client (subscribe() is blocking)
					const redis = await getRedisClient();
					subscriber = redis.duplicate();
					await subscriber.connect();

					await subscriber.subscribe(chatChannel(roomId), (message) => {
						try {
							const event = JSON.parse(message) as ChatMessageEvent;
							send('message', event);
						} catch {
							// Malformed payload — skip
						}
					});
				} catch (err) {
					console.error('[chat-sse] Redis subscribe failed:', err);
					subscriber = null;
				}
			}

			// 3. Heartbeat every 25s
			const heartbeatTimer = setInterval(() => {
				send('heartbeat', { ts: Date.now() });
			}, 25_000);

			// 4. Cleanup on stream cancel (client disconnects)
			return () => {
				clearInterval(heartbeatTimer);
				if (subscriber) {
					subscriber.unsubscribe(chatChannel(roomId)).catch(() => {});
					subscriber.quit().catch(() => {});
				}
			};
		}
	});
}
