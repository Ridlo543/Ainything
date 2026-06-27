/**
 * Domain types for the staff↔buyer real-time chat feature.
 *
 * "Room" = one fallback_request. Messages are stored in the existing
 * chat_messages table with fallback_request_id set (non-null distinguishes
 * staff chat messages from AI assistant messages).
 */

export type ChatMessageRole = 'customer' | 'staff' | 'system';

export type StaffChatMessage = {
	id: string;
	roomId: string; // fallback_request_id
	role: ChatMessageRole;
	content: string;
	senderId: string | null; // app_user.id for staff; null for buyer/system
	senderName: string | null; // display name resolved at query time
	createdAt: string; // ISO 8601
};

/** Slim shape sent over SSE to avoid over-sharing DB internals. */
export type ChatMessageEvent = {
	type: 'message';
	id: string;
	roomId: string;
	role: ChatMessageRole;
	content: string;
	senderName: string | null;
	createdAt: string;
};

/** Heartbeat event sent every 25s to keep SSE connection alive. */
export type ChatHeartbeatEvent = {
	type: 'heartbeat';
	ts: number;
};

export type ChatSSEEvent = ChatMessageEvent | ChatHeartbeatEvent;
