/**
 * Staff chat repository — read/write operations for staff↔buyer chat messages.
 *
 * All queries are scoped to a fallback_request (room). Staff queries run inside
 * withUserContext so RLS policies evaluate against the authenticated staff user.
 * Buyer queries run inside withPublicSessionContext so RLS policies evaluate
 * against the public session ID.
 *
 * Query style follows the existing repository conventions:
 * - Explicit ::text / ::uuid casts for UUID columns
 * - Parameterised queries only — no string interpolation
 * - No UPDATE or DELETE — chat_messages is append-only
 */

import { withUserContext, withPublicSessionContext, query } from '$lib/server/db/postgres';
import type { StaffChatMessage } from '$lib/domain/chat/types';

// ---------------------------------------------------------------------------
// DB row type
// ---------------------------------------------------------------------------

type ChatMessageRow = {
	id: string;
	fallback_request_id: string;
	role: string;
	content: string;
	sender_id: string | null;
	sender_name: string | null;
	created_at: string;
};

function mapRow(row: ChatMessageRow): StaffChatMessage {
	return {
		id: row.id,
		roomId: row.fallback_request_id,
		role: row.role as StaffChatMessage['role'],
		content: row.content,
		senderId: row.sender_id,
		senderName: row.sender_name,
		createdAt: row.created_at
	};
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Load message history for a room, oldest-first, capped at `limit`.
 * Uses a direct pool query (no transaction overhead) — access is validated
 * at the service layer before this is called.
 *
 * We fetch DESC to leverage the (fallback_request_id, created_at DESC) index,
 * then reverse in application code so the client receives chronological order.
 */
export async function getMessagesByRoom(roomId: string, limit = 50): Promise<StaffChatMessage[]> {
	const result = await query<ChatMessageRow>(
		`
		SELECT
			cm.id::text,
			cm.fallback_request_id::text,
			cm.role,
			cm.content,
			cm.sender_id::text,
			au.full_name AS sender_name,
			cm.created_at::text
		FROM   chat_messages cm
		LEFT   JOIN app_users au ON au.id = cm.sender_id
		WHERE  cm.fallback_request_id = $1::uuid
		ORDER  BY cm.created_at DESC
		LIMIT  $2
		`,
		[roomId, limit]
	);
	// Reverse so oldest message is first — matches chat display order
	return result.rows.map(mapRow).reverse();
}

/**
 * Insert a message sent by a staff member.
 * Runs inside withUserContext so the staff RLS INSERT policy is satisfied.
 * Returns the message with the sender's full_name resolved via a subquery.
 */
export async function insertStaffMessage(
	roomId: string,
	staffExternalId: string,
	staffUserId: string,
	content: string,
	organizationId: string,
	outletId: string
): Promise<StaffChatMessage> {
	return withUserContext(staffExternalId, async (client) => {
		const result = await client.query<ChatMessageRow>(
			`
			INSERT INTO chat_messages (
				organization_id, outlet_id,
				fallback_request_id, sender_id,
				role, content, safety_status
			)
			VALUES (
				$1::uuid, $2::uuid,
				$3::uuid, $4::uuid,
				'staff', $5, 'approved'
			)
			RETURNING
				id::text,
				fallback_request_id::text,
				role,
				content,
				sender_id::text,
				(SELECT full_name FROM app_users WHERE id = $4::uuid) AS sender_name,
				created_at::text
			`,
			[organizationId, outletId, roomId, staffUserId, content]
		);

		const row = result.rows[0];
		return mapRow(row);
	});
}

/**
 * Insert a message sent by a buyer.
 * Runs inside withPublicSessionContext so the buyer RLS INSERT policy
 * (scoped to public_session_id) is satisfied.
 */
export async function insertBuyerMessage(
	roomId: string,
	sessionId: string,
	content: string,
	organizationId: string,
	outletId: string
): Promise<StaffChatMessage> {
	return withPublicSessionContext(sessionId, async (client) => {
		const result = await client.query<ChatMessageRow>(
			`
			INSERT INTO chat_messages (
				organization_id, outlet_id,
				fallback_request_id, buyer_session_id,
				role, content, safety_status
			)
			VALUES (
				$1::uuid, $2::uuid,
				$3::uuid, (
					SELECT id FROM buyer_sessions WHERE public_session_id = $4
					LIMIT 1
				),
				'customer', $5, 'approved'
			)
			RETURNING
				id::text,
				fallback_request_id::text,
				role,
				content,
				NULL::uuid::text AS sender_id,
				NULL::text        AS sender_name,
				created_at::text
			`,
			[organizationId, outletId, roomId, sessionId, content]
		);

		return mapRow(result.rows[0]);
	});
}

/**
 * Find the most-recent fallback_request for a given buyer_session_id + outlet_id.
 * Used by page loaders to surface the chat room ID when an order has an associated
 * fallback request (i.e. the buyer previously triggered the AI fallback flow).
 * Returns null when no fallback_request exists for this session/outlet pair.
 */
export async function findRoomByBuyerSession(params: {
	buyerSessionId: string;
	outletId: string;
}): Promise<string | null> {
	const result = await query<{ id: string }>(
		`
		SELECT id::text
		FROM   fallback_requests
		WHERE  buyer_session_id = $1::uuid
		  AND  outlet_id        = $2::uuid
		ORDER  BY created_at DESC
		LIMIT  1
		`,
		[params.buyerSessionId, params.outletId]
	);
	return result.rows[0]?.id ?? null;
}

/**
 * Verify that a public session ID (from cookie) owns the given room.
 *
 * fallback_requests.buyer_session_id is a UUID FK to buyer_sessions.id.
 * The cookie value is buyer_sessions.public_session_id (a separate string).
 * We must JOIN to compare — a direct UUID comparison would always fail.
 *
 * Returns true if the session owns the room, false otherwise.
 */
export async function verifyBuyerOwnsRoom(
	roomId: string,
	publicSessionId: string
): Promise<boolean> {
	const result = await query<{ exists: boolean }>(
		`
		SELECT EXISTS (
			SELECT 1
			FROM   fallback_requests fr
			JOIN   buyer_sessions bs ON bs.id = fr.buyer_session_id
			WHERE  fr.id                  = $1::uuid
			  AND  bs.public_session_id   = $2
		) AS exists
		`,
		[roomId, publicSessionId]
	);
	return result.rows[0]?.exists ?? false;
}

/**
 * Validate that a public session owns the room AND return the room context in
 * one query — eliminates the double round-trip in sendBuyerMessage.
 *
 * Returns { organizationId, outletId } when the session owns the room,
 * or null when the room doesn't exist or the session doesn't match.
 */
export async function getBuyerRoomContext(
	roomId: string,
	publicSessionId: string
): Promise<{ organizationId: string; outletId: string } | null> {
	const result = await query<{ organization_id: string; outlet_id: string }>(
		`
		SELECT
			fr.organization_id::text,
			fr.outlet_id::text
		FROM   fallback_requests fr
		JOIN   buyer_sessions bs ON bs.id = fr.buyer_session_id
		WHERE  fr.id                = $1::uuid
		  AND  bs.public_session_id = $2
		LIMIT  1
		`,
		[roomId, publicSessionId]
	);

	if (result.rows.length === 0) return null;

	const row = result.rows[0];
	return {
		organizationId: row.organization_id,
		outletId: row.outlet_id
	};
}

/**
 * Validate that a fallback_request belongs to the given outlet.
 * Used by the service layer to guard SSE subscriptions and message sends.
 * Returns the room's organization_id + outlet_id if valid, null otherwise.
 */
export async function getRoomContext(
	roomId: string
): Promise<{ organizationId: string; outletId: string; buyerSessionId: string | null } | null> {
	const result = await query<{
		organization_id: string;
		outlet_id: string;
		buyer_session_id: string | null;
	}>(
		`
		SELECT
			organization_id::text,
			outlet_id::text,
			buyer_session_id::text
		FROM   fallback_requests
		WHERE  id = $1::uuid
		LIMIT  1
		`,
		[roomId]
	);

	if (result.rows.length === 0) return null;

	const row = result.rows[0];
	return {
		organizationId: row.organization_id,
		outletId: row.outlet_id,
		buyerSessionId: row.buyer_session_id
	};
}
