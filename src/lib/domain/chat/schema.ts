import { z } from 'zod';

/** Maximum message length — keeps DB rows small and prevents abuse. */
const MAX_CONTENT_LENGTH = 2000;

/**
 * Buyer sends a message in their chat room.
 * sessionId proves ownership (validated against buyer_sessions at DB layer).
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
