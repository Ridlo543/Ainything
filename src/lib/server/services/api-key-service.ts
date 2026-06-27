import { createHash, randomBytes } from 'crypto';
import { error } from '@sveltejs/kit';
import type { AuthUser } from '$lib/domain/auth/types';
import type { ApiKey, GeneratedApiKey } from '$lib/domain/api-key/types';
import {
	listApiKeys as repoListApiKeys,
	insertApiKey,
	revokeApiKey as repoRevokeApiKey,
	findActiveKeyByHash
} from '$lib/server/repositories/api-key-repository';

// ---------------------------------------------------------------------------
// Key format
// ---------------------------------------------------------------------------

/** Prefix for all platform API keys. Makes them easily identifiable. */
const KEY_PREFIX_STRING = 'ak_live_';

/**
 * Generate a cryptographically secure raw API key.
 * Format: `ak_live_<64 hex chars>` (32 random bytes = 256 bits of entropy)
 */
function generateRawKey(): string {
	return KEY_PREFIX_STRING + randomBytes(32).toString('hex');
}

/**
 * Derive the display prefix (first 16 chars — includes `ak_live_` + 8 hex chars).
 * This is stored and shown in the key list so admins can identify a key.
 */
function deriveKeyPrefix(rawKey: string): string {
	return rawKey.slice(0, 16);
}

/**
 * Hash a raw key with SHA-256 for storage.
 * Never store the raw key — only this hash.
 */
function hashKey(rawKey: string): string {
	return createHash('sha256').update(rawKey).digest('hex');
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * List all platform API keys (no hashes, ordered newest first).
 * @param caller  Authenticated user performing the action (must be super_admin)
 */
export async function getApiKeys(caller: AuthUser): Promise<ApiKey[]> {
	if (caller.platformRole !== 'super_admin') {
		error(403, 'Only platform admins can list API keys');
	}
	return repoListApiKeys();
}

/**
 * Generate a new API key.
 * The raw key is returned ONCE and never retrievable again.
 * @param name         Human-readable label for the key
 * @param expiresAt    ISO string or null for no expiry
 * @param caller       Authenticated user performing the action (must be super_admin)
 */
export async function generateApiKey(
	name: string,
	expiresAt: string | null,
	caller: AuthUser
): Promise<GeneratedApiKey> {
	if (caller.platformRole !== 'super_admin') {
		error(403, 'Only platform admins can generate API keys');
	}

	const rawKey = generateRawKey();
	const keyPrefix = deriveKeyPrefix(rawKey);
	const keyHash = hashKey(rawKey);

	const row = await insertApiKey({
		name,
		keyPrefix,
		keyHash,
		createdById: caller.id,
		expiresAt
	});

	return { key: rawKey, row };
}

/**
 * Revoke an existing API key by ID.
 * @param id      UUID of the key to revoke
 * @param caller  Authenticated user performing the action (must be super_admin)
 */
export async function revokeApiKey(id: string, caller: AuthUser): Promise<void> {
	if (caller.platformRole !== 'super_admin') {
		error(403, 'Only platform admins can revoke API keys');
	}

	const revoked = await repoRevokeApiKey(id);
	if (!revoked) {
		error(404, 'API key not found or already revoked');
	}
}

/**
 * Verify a raw API key from an incoming request.
 * Hashes the key and looks it up in the database.
 * Updates last_used_at as a side effect.
 *
 * Returns the ApiKey row if valid, null otherwise.
 * Intended for use in SvelteKit `hooks.server.ts` or API endpoint guards.
 */
export async function verifyApiKey(rawKey: string): Promise<ApiKey | null> {
	if (!rawKey.startsWith(KEY_PREFIX_STRING)) return null;
	const keyHash = hashKey(rawKey);
	return findActiveKeyByHash(keyHash);
}
