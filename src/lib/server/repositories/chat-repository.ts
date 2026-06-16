import { withPublicSessionContext, query, type DatabaseClient } from '$lib/server/db/postgres';
import type { ChatRole, ChatSafetyStatus } from '$lib/domain/session/schema';

type ChatMessageRow = {
	id: string;
	role: ChatRole;
	content: string;
	safety_status: ChatSafetyStatus;
	created_at: string;
};

type SavedMessage = {
	id: string;
	role: ChatRole;
	content: string;
	safetyStatus: ChatSafetyStatus;
	createdAt: string;
};

type PersistChatTurnInput = {
	organizationId: string;
	restaurantId: string;
	sessionId: string;
	customerContent: string;
	assistantContent: string;
	assistantSafety: ChatSafetyStatus;
};

type PersistChatTurnResult = {
	customerMessage: SavedMessage;
	assistantMessage: SavedMessage;
};

function mapRow(row: ChatMessageRow): SavedMessage {
	return {
		id: row.id,
		role: row.role,
		content: row.content,
		safetyStatus: row.safety_status,
		createdAt: row.created_at
	};
}

async function insertMessage(
	client: DatabaseClient,
	params: {
		organizationId: string;
		restaurantId: string;
		sessionId: string;
		role: ChatRole;
		content: string;
		safetyStatus: ChatSafetyStatus;
	}
): Promise<SavedMessage> {
	const result = await client.query<ChatMessageRow>(
		`
			INSERT INTO chat_messages (
				organization_id,
				restaurant_id,
				session_id,
				role,
				content,
				safety_status
			)
			VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
			RETURNING id::text, role, content, safety_status, created_at::text
		`,
		[
			params.organizationId,
			params.restaurantId,
			params.sessionId,
			params.role,
			params.content,
			params.safetyStatus
		]
	);

	return mapRow(result.rows[0]);
}

/**
 * Persists a customer question and an assistant response in a single transaction
 * with `app.public_session_id` set so the RLS policies can validate session ownership.
 *
 * The assistant answer is currently a placeholder. Phase 7 will replace the answer
 * content with a real RAG-generated response before calling this function.
 */
export async function persistChatTurn(input: PersistChatTurnInput): Promise<PersistChatTurnResult> {
	return withPublicSessionContext(input.sessionId, async (client) => {
		const customerMessage = await insertMessage(client, {
			organizationId: input.organizationId,
			restaurantId: input.restaurantId,
			sessionId: input.sessionId,
			role: 'customer',
			content: input.customerContent,
			safetyStatus: 'ok'
		});

		const assistantMessage = await insertMessage(client, {
			organizationId: input.organizationId,
			restaurantId: input.restaurantId,
			sessionId: input.sessionId,
			role: 'assistant',
			content: input.assistantContent,
			safetyStatus: input.assistantSafety
		});

		return { customerMessage, assistantMessage };
	});
}

/**
 * Loads the most recent `limit` chat messages for a session, ordered oldest-first
 * so the LLM receives the conversation in natural reading order.
 * Only customer and assistant messages are returned (not system/staff messages).
 */
export async function getRecentHistory(
	sessionId: string,
	limit: number
): Promise<Array<{ role: 'customer' | 'assistant'; content: string }>> {
	const result = await query<{ role: ChatRole; content: string }>(
		`
			SELECT role, content
			FROM (
				SELECT role, content, created_at
				FROM chat_messages
				WHERE session_id = $1::uuid
					AND role IN ('customer', 'assistant')
				ORDER BY created_at DESC
				LIMIT $2
			) recent
			ORDER BY created_at ASC
		`,
		[sessionId, limit]
	);

	return result.rows.map((row) => ({
		role: row.role as 'customer' | 'assistant',
		content: row.content
	}));
}
