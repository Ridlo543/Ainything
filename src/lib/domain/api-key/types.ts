// Domain types for platform API keys.
// Raw keys are never stored — only key_prefix (display) and key_hash (lookup).

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export type ApiKey = {
	id: string;
	name: string;
	keyPrefix: string; // first 16 chars of raw key, for display
	createdById: string;
	createdByName: string;
	lastUsedAt: string | null;
	expiresAt: string | null;
	revokedAt: string | null;
	createdAt: string;
	status: ApiKeyStatus;
};

/** Returned only once at generation time — never stored or re-retrievable. */
export type GeneratedApiKey = {
	key: string; // full raw key, shown once
	row: ApiKey;
};
