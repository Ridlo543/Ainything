import { getPool } from '$lib/server/db/postgres';
import type { ApiKey, ApiKeyStatus } from '$lib/domain/api-key/types';

// ---------------------------------------------------------------------------
// Row type (internal — not exported)
// ---------------------------------------------------------------------------

type ApiKeyRow = {
	id: string;
	name: string;
	keyPrefix: string;
	createdById: string;
	createdByName: string;
	lastUsedAt: string | null;
	expiresAt: string | null;
	revokedAt: string | null;
	createdAt: string;
};

function deriveStatus(row: ApiKeyRow): ApiKeyStatus {
	if (row.revokedAt) return 'revoked';
	if (row.expiresAt && new Date(row.expiresAt) < new Date()) return 'expired';
	return 'active';
}

function mapRow(row: ApiKeyRow): ApiKey {
	return {
		id: row.id,
		name: row.name,
		keyPrefix: row.keyPrefix,
		createdById: row.createdById,
		createdByName: row.createdByName,
		lastUsedAt: row.lastUsedAt,
		expiresAt: row.expiresAt,
		revokedAt: row.revokedAt,
		createdAt: row.createdAt,
		status: deriveStatus(row)
	};
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const SELECT_COLUMNS = `
	k.id::text,
	k.name,
	k.key_prefix        AS "keyPrefix",
	k.created_by::text  AS "createdById",
	u.full_name         AS "createdByName",
	k.last_used_at      AS "lastUsedAt",
	k.expires_at        AS "expiresAt",
	k.revoked_at        AS "revokedAt",
	k.created_at        AS "createdAt"
`;

/**
 * List all API keys (no key_hash returned — hashes are never exposed post-insert).
 * Ordered newest first.
 */
export async function listApiKeys(): Promise<ApiKey[]> {
	const pool = getPool();
	const { rows } = await pool.query<ApiKeyRow>(`
		SELECT ${SELECT_COLUMNS}
		FROM public.api_keys k
		JOIN public.app_users u ON u.id = k.created_by
		ORDER BY k.created_at DESC
	`);
	return rows.map(mapRow);
}

/**
 * Insert a new API key. key_hash is the only time it is ever stored.
 * Returns the row (without hash) for display alongside the raw key.
 */
export async function insertApiKey(params: {
	name: string;
	keyPrefix: string;
	keyHash: string;
	createdById: string;
	expiresAt: string | null;
}): Promise<ApiKey> {
	const pool = getPool();
	const { name, keyPrefix, keyHash, createdById, expiresAt } = params;

	const { rows } = await pool.query<ApiKeyRow>(
		`
		WITH inserted AS (
			INSERT INTO public.api_keys (name, key_prefix, key_hash, created_by, expires_at)
			VALUES ($1, $2, $3, $4::uuid, $5::timestamptz)
			RETURNING
				id,
				name,
				key_prefix,
				created_by,
				last_used_at,
				expires_at,
				revoked_at,
				created_at
		)
		SELECT
			i.id::text,
			i.name,
			i.key_prefix        AS "keyPrefix",
			i.created_by::text  AS "createdById",
			u.full_name         AS "createdByName",
			i.last_used_at      AS "lastUsedAt",
			i.expires_at        AS "expiresAt",
			i.revoked_at        AS "revokedAt",
			i.created_at        AS "createdAt"
		FROM inserted i
		JOIN public.app_users u ON u.id = i.created_by
		`,
		[name, keyPrefix, keyHash, createdById, expiresAt]
	);

	const row = rows[0];
	if (!row) throw new Error('Failed to insert API key');
	return mapRow(row);
}

/**
 * Soft-revoke a key by setting revoked_at = now().
 * Returns false if the key was not found or already revoked.
 */
export async function revokeApiKey(id: string): Promise<boolean> {
	const pool = getPool();
	const { rowCount } = await pool.query(
		`
		UPDATE public.api_keys
		SET revoked_at = now()
		WHERE id = $1::uuid
		  AND revoked_at IS NULL
		`,
		[id]
	);
	return (rowCount ?? 0) > 0;
}

/**
 * Look up a key by its SHA-256 hash for authentication.
 * Updates last_used_at as a side effect.
 * Returns null if not found, revoked, or expired.
 */
export async function findActiveKeyByHash(keyHash: string): Promise<ApiKey | null> {
	const pool = getPool();
	const { rows } = await pool.query<ApiKeyRow>(
		`
		UPDATE public.api_keys k
		SET    last_used_at = now()
		FROM   public.app_users u
		WHERE  k.created_by = u.id
		  AND  k.key_hash   = $1
		  AND  k.revoked_at IS NULL
		  AND  (k.expires_at IS NULL OR k.expires_at > now())
		RETURNING
			k.id::text,
			k.name,
			k.key_prefix       AS "keyPrefix",
			k.created_by::text AS "createdById",
			u.full_name        AS "createdByName",
			k.last_used_at     AS "lastUsedAt",
			k.expires_at       AS "expiresAt",
			k.revoked_at       AS "revokedAt",
			k.created_at       AS "createdAt"
		`,
		[keyHash]
	);
	const row = rows[0];
	return row ? mapRow(row) : null;
}
