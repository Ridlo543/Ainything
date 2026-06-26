import { getPool } from '$lib/server/db/postgres';

export type MembershipRow = {
	id: string;
	user_id: string;
	organization_id: string;
	role: string;
	created_at: string;
	updated_at: string;
};

export type MembershipWithUserRow = MembershipRow & {
	user_email: string;
	user_name: string;
};

export type InviteRow = {
	id: string;
	organization_id: string;
	email: string;
	role: string;
	invited_by_user_id: string;
	token: string;
	expires_at: string;
	accepted_at: string | null;
	created_at: string;
};

export type InviteWithInviterRow = InviteRow & {
	inviter_name: string;
};

export async function listMembershipsWithUsers(
	organizationId: string
): Promise<MembershipWithUserRow[]> {
	const pool = getPool();
	const { rows } = await pool.query<MembershipWithUserRow>(
		`SELECT 
			m.id,
			m.user_id,
			m.organization_id,
			m.role,
			m.created_at,
			m.updated_at,
			u.email as user_email,
			u.name as user_name
		FROM memberships m
		JOIN app_users u ON u.id = m.user_id
		WHERE m.organization_id = $1
		ORDER BY m.created_at ASC`,
		[organizationId]
	);
	return rows;
}

export async function listPendingInvitesWithInviter(
	organizationId: string
): Promise<InviteWithInviterRow[]> {
	const pool = getPool();
	const { rows } = await pool.query<InviteWithInviterRow>(
		`SELECT 
			i.id,
			i.organization_id,
			i.email,
			i.role,
			i.invited_by_user_id,
			i.token,
			i.expires_at,
			i.accepted_at,
			i.created_at,
			u.name as inviter_name
		FROM invites i
		JOIN app_users u ON u.id = i.invited_by_user_id
		WHERE i.organization_id = $1
		  AND i.accepted_at IS NULL
		  AND i.expires_at > now()
		ORDER BY i.created_at DESC`,
		[organizationId]
	);
	return rows;
}

export async function createInvite(params: {
	organizationId: string;
	email: string;
	role: string;
	invitedByUserId: string;
	token: string;
	expiresAt: Date;
}): Promise<InviteRow> {
	const pool = getPool();
	const { rows } = await pool.query<InviteRow>(
		`INSERT INTO invites (organization_id, email, role, invited_by_user_id, token, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, organization_id, email, role, invited_by_user_id, token, expires_at, accepted_at, created_at`,
		[
			params.organizationId,
			params.email,
			params.role,
			params.invitedByUserId,
			params.token,
			params.expiresAt.toISOString()
		]
	);
	return rows[0];
}

export async function deleteMembership(
	membershipId: string,
	organizationId: string
): Promise<void> {
	const pool = getPool();
	await pool.query('DELETE FROM memberships WHERE id = $1 AND organization_id = $2', [
		membershipId,
		organizationId
	]);
}

export async function deleteInvite(inviteId: string, organizationId: string): Promise<void> {
	const pool = getPool();
	await pool.query('DELETE FROM invites WHERE id = $1 AND organization_id = $2', [
		inviteId,
		organizationId
	]);
}

export async function findInviteByToken(token: string): Promise<InviteRow | null> {
	const pool = getPool();
	const { rows } = await pool.query<InviteRow>(
		`SELECT id, organization_id, email, role, invited_by_user_id, token, expires_at, accepted_at, created_at
		FROM invites
		WHERE token = $1 AND accepted_at IS NULL AND expires_at > now()
		LIMIT 1`,
		[token]
	);
	return rows[0] ?? null;
}

export async function markInviteAccepted(inviteId: string): Promise<void> {
	const pool = getPool();
	await pool.query('UPDATE invites SET accepted_at = now() WHERE id = $1', [inviteId]);
}

export async function updateMembershipRole(
	membershipId: string,
	organizationId: string,
	role: string
): Promise<void> {
	const pool = getPool();
	await pool.query('UPDATE memberships SET role = $1 WHERE id = $2 AND organization_id = $3', [
		role,
		membershipId,
		organizationId
	]);
}

export type NewUserRow = {
	id: string;
	email: string;
	name: string;
};

/**
 * Atomically creates an app_user with password_hash and a membership in one transaction.
 * Uses a client from the pool to wrap both inserts in BEGIN/COMMIT.
 */
export async function createUserWithMembership(params: {
	email: string;
	name: string;
	passwordHash: string;
	organizationId: string;
	role: string;
}): Promise<NewUserRow> {
	const pool = getPool();
	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		// Check for duplicate email first (app_users.email has a unique constraint)
		const existing = await client.query<{ id: string }>(
			'SELECT id FROM app_users WHERE email = $1 LIMIT 1',
			[params.email]
		);
		if (existing.rows.length > 0) {
			throw new Error('EMAIL_ALREADY_EXISTS');
		}

		const { rows: userRows } = await client.query<NewUserRow>(
			`INSERT INTO app_users (email, name, external_auth_id, password_hash, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, now(), now())
			 RETURNING id, email, name`,
			[params.email, params.name, `local:${params.email}`, params.passwordHash]
		);
		const user = userRows[0];

		await client.query(
			`INSERT INTO memberships (user_id, organization_id, role, created_at, updated_at)
			 VALUES ($1, $2, $3, now(), now())`,
			[user.id, params.organizationId, params.role]
		);

		await client.query('COMMIT');
		return user;
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

/**
 * Updates a user's name and optionally their password hash.
 * Scoped by organizationId to prevent cross-tenant edits.
 */
export async function updateUserProfile(params: {
	membershipId: string;
	organizationId: string;
	name: string;
	passwordHash?: string;
}): Promise<void> {
	const pool = getPool();
	if (params.passwordHash) {
		await pool.query(
			`UPDATE app_users u
			 SET name = $1, password_hash = $2, updated_at = now()
			 FROM memberships m
			 WHERE m.id = $3
			   AND m.organization_id = $4
			   AND u.id = m.user_id`,
			[params.name, params.passwordHash, params.membershipId, params.organizationId]
		);
	} else {
		await pool.query(
			`UPDATE app_users u
			 SET name = $1, updated_at = now()
			 FROM memberships m
			 WHERE m.id = $2
			   AND m.organization_id = $3
			   AND u.id = m.user_id`,
			[params.name, params.membershipId, params.organizationId]
		);
	}
}

// ---------------------------------------------------------------------------
// Restaurant settings
// ---------------------------------------------------------------------------

export type RestaurantSettingsRow = {
	id: string;
	name: string;
	slug: string;
	location: string;
	segment: string;
	timezone: string;
	default_language_tag: string;
	language_tags: string[];
	description: string;
	status: string;
};

export async function getRestaurantSettings(
	restaurantId: string,
	organizationId: string
): Promise<RestaurantSettingsRow | null> {
	const pool = getPool();
	const result = await pool.query<RestaurantSettingsRow>(
		`SELECT id, name, slug, location, business_type AS segment, timezone, default_language_tag, language_tags, description, status
		 FROM outlets WHERE id = $1 AND organization_id = $2`,
		[restaurantId, organizationId]
	);
	return result.rows[0] ?? null;
}

export async function updateRestaurantSettings(
	restaurantId: string,
	organizationId: string,
	data: {
		name: string;
		location: string;
		segment: string;
		timezone: string;
		defaultLanguageTag: string;
		description: string;
	}
): Promise<void> {
	const pool = getPool();
	await pool.query(
		`UPDATE outlets
		 SET name = $1, location = $2, business_type = $3, timezone = $4,
		     default_language_tag = $5, description = $6, updated_at = now()
		 WHERE id = $7 AND organization_id = $8`,
		[
			data.name,
			data.location,
			data.segment,
			data.timezone,
			data.defaultLanguageTag,
			data.description,
			restaurantId,
			organizationId
		]
	);
}
