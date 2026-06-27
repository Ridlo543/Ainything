import { z } from 'zod';

/** Maximum message length — keeps DB rows small and prevents abuse. */
const MAX_CONTENT_LENGTH = 2000;

/**
 * Buyer sends a message in their chat room.
 *
 * `sessionId` is injected server-side from the session cookie — clients
 * only need to send `content`. The field is kept here so the server can
 * parse a merged object `{ ...body, sessionId }` in a single safeParse call.
 */
export const buyerSendMessageSchema = z.object({
	sessionId: z.string().uuid(),
	content: z.string().trim().min(1).max(MAX_CONTENT_LENGTH)
});

/**
 * Staff sends a reply in a chat room.
 * roomId = fallback_request.id — validated against membership at service layer.
 */
export const staffSendMessageSchema = z.object({
	content: z.string().trim().min(1).max(MAX_CONTENT_LENGTH)
});

export type BuyerSendMessageInput = z.infer<typeof buyerSendMessageSchema>;
export type StaffSendMessageInput = z.infer<typeof staffSendMessageSchema>;

// ---------------------------------------------------------------------------
// SSE runtime validation schemas
// Used in both StaffChatWindow and BuyerChatWindow to validate SSE payloads
// before they are applied to UI state. Prevents silent breakage on malformed
// or unexpected server payloads.
// ---------------------------------------------------------------------------

/** Matches the StaffChatMessage domain type. */
export const staffChatMessageSchema = z.object({
	id: z.string(),
	roomId: z.string(),
	role: z.enum(['customer', 'staff', 'system']),
	content: z.string(),
	senderId: z.string().nullable(),
	senderName: z.string().nullable(),
	createdAt: z.string()
});

/** Array of messages sent as the initial `history` SSE event. */
export const chatHistorySchema = z.array(staffChatMessageSchema);

/** Single message sent as a `message` SSE event (ChatMessageEvent shape). */
export const chatMessageEventSchema = z.object({
	type: z.literal('message'),
	id: z.string(),
	roomId: z.string(),
	role: z.enum(['customer', 'staff', 'system']),
	content: z.string(),
	senderName: z.string().nullable(),
	createdAt: z.string()
});

export type ChatMessageEventPayload = z.infer<typeof chatMessageEventSchema>;

/**
 * Validates the JSON response body from POST /api/chat/[roomId]/messages
 * and POST /api/public/chat/[roomId]/messages.
 * Used in both StaffChatWindow and BuyerChatWindow to guard the
 * optimistic-replace path against malformed server responses.
 */
export const chatMessageResponseSchema = staffChatMessageSchema;
