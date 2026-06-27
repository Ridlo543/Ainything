import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Mock the repository before importing the service under test
// ---------------------------------------------------------------------------

const listApiKeysMock = vi.fn();
const insertApiKeyMock = vi.fn();
const revokeApiKeyMock = vi.fn();
const findActiveKeyByHashMock = vi.fn();

vi.mock('$lib/server/repositories/api-key-repository', () => ({
	listApiKeys: (...args: unknown[]) => listApiKeysMock(...args),
	insertApiKey: (...args: unknown[]) => insertApiKeyMock(...args),
	revokeApiKey: (...args: unknown[]) => revokeApiKeyMock(...args),
	findActiveKeyByHash: (...args: unknown[]) => findActiveKeyByHashMock(...args)
}));

// SvelteKit error() throws — replicate exact behavior
vi.mock('@sveltejs/kit', () => ({
	error: (status: number, message: string) => {
		const err = new Error(message) as Error & { status: number };
		err.status = status;
		throw err;
	}
}));

const { getApiKeys, generateApiKey, revokeApiKey, verifyApiKey } =
	await import('./api-key-service');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const KEY_ID = 'k1k2k3k4-k5k6-4k7k-8k9k-kkkkkkkkkkkk';
const USER_ID = 'u1u2u3u4-u5u6-4u7u-8u9u-uuuuuuuuuuuu';

import type { ApiKey } from '$lib/domain/api-key/types';
import type { AuthUser } from '$lib/domain/auth/types';

const MOCK_KEY: ApiKey = {
	id: KEY_ID,
	name: 'Test Integration Key',
	keyPrefix: 'ak_live_abcd',
	createdById: USER_ID,
	createdByName: 'Admin User',
	lastUsedAt: null,
	expiresAt: null,
	revokedAt: null,
	createdAt: new Date().toISOString(),
	status: 'active'
};

const SUPER_ADMIN: AuthUser = {
	id: USER_ID,
	email: 'admin@example.com',
	name: 'Admin User',
	platformRole: 'super_admin',
	memberships: []
};

const STAFF_USER: AuthUser = {
	id: USER_ID,
	email: 'staff@example.com',
	name: 'Staff User',
	platformRole: 'staff',
	memberships: []
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getApiKeys', () => {
	beforeEach(() => {
		listApiKeysMock.mockReset();
	});

	it('returns the list from the repository', async () => {
		listApiKeysMock.mockResolvedValue([MOCK_KEY]);

		const result = await getApiKeys(SUPER_ADMIN);

		expect(result).toEqual([MOCK_KEY]);
		expect(listApiKeysMock).toHaveBeenCalledOnce();
	});

	it('returns empty array when no keys exist', async () => {
		listApiKeysMock.mockResolvedValue([]);

		const result = await getApiKeys(SUPER_ADMIN);

		expect(result).toEqual([]);
	});

	it('throws 403 when caller is not super_admin', async () => {
		await expect(getApiKeys(STAFF_USER)).rejects.toMatchObject({ status: 403 });

		expect(listApiKeysMock).not.toHaveBeenCalled();
	});
});

describe('generateApiKey', () => {
	beforeEach(() => {
		insertApiKeyMock.mockReset();
	});

	it('generates a key with ak_live_ prefix and correct format', async () => {
		insertApiKeyMock.mockResolvedValue(MOCK_KEY);

		const { key, row } = await generateApiKey('Test Key', null, SUPER_ADMIN);

		expect(key).toMatch(/^ak_live_[0-9a-f]{64}$/);
		expect(row).toEqual(MOCK_KEY);
	});

	it('passes correct prefix (first 16 chars) and hash to repository', async () => {
		insertApiKeyMock.mockResolvedValue(MOCK_KEY);

		const { key } = await generateApiKey('Test Key', null, SUPER_ADMIN);

		const expectedPrefix = key.slice(0, 16);
		const expectedHash = createHash('sha256').update(key).digest('hex');

		expect(insertApiKeyMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Test Key',
				keyPrefix: expectedPrefix,
				keyHash: expectedHash,
				createdById: USER_ID,
				expiresAt: null
			})
		);
	});

	it('passes expiresAt to repository when provided', async () => {
		insertApiKeyMock.mockResolvedValue(MOCK_KEY);
		const expiresAt = '2027-01-01T00:00:00.000Z';

		await generateApiKey('Expiring Key', expiresAt, SUPER_ADMIN);

		expect(insertApiKeyMock).toHaveBeenCalledWith(expect.objectContaining({ expiresAt }));
	});

	it('throws 403 when caller is not super_admin', async () => {
		await expect(generateApiKey('Test Key', null, STAFF_USER)).rejects.toMatchObject({
			status: 403
		});

		expect(insertApiKeyMock).not.toHaveBeenCalled();
	});

	it('each generated key is unique (different random bytes)', async () => {
		insertApiKeyMock.mockResolvedValue(MOCK_KEY);

		const [{ key: key1 }, { key: key2 }] = await Promise.all([
			generateApiKey('Key 1', null, SUPER_ADMIN),
			generateApiKey('Key 2', null, SUPER_ADMIN)
		]);

		expect(key1).not.toEqual(key2);
	});
});

describe('revokeApiKey', () => {
	beforeEach(() => {
		revokeApiKeyMock.mockReset();
	});

	it('successfully revokes an existing key', async () => {
		revokeApiKeyMock.mockResolvedValue(true);

		await expect(revokeApiKey(KEY_ID, SUPER_ADMIN)).resolves.toBeUndefined();

		expect(revokeApiKeyMock).toHaveBeenCalledWith(KEY_ID);
	});

	it('throws 404 when key is not found or already revoked', async () => {
		revokeApiKeyMock.mockResolvedValue(false);

		await expect(revokeApiKey(KEY_ID, SUPER_ADMIN)).rejects.toMatchObject({
			status: 404
		});
	});

	it('throws 403 when caller is not super_admin', async () => {
		await expect(revokeApiKey(KEY_ID, STAFF_USER)).rejects.toMatchObject({
			status: 403
		});

		expect(revokeApiKeyMock).not.toHaveBeenCalled();
	});
});

describe('verifyApiKey', () => {
	beforeEach(() => {
		findActiveKeyByHashMock.mockReset();
	});

	it('returns null immediately for keys without ak_live_ prefix', async () => {
		const result = await verifyApiKey('sk_test_invalid_key');

		expect(result).toBeNull();
		expect(findActiveKeyByHashMock).not.toHaveBeenCalled();
	});

	it('returns null for empty string', async () => {
		const result = await verifyApiKey('');

		expect(result).toBeNull();
		expect(findActiveKeyByHashMock).not.toHaveBeenCalled();
	});

	it('hashes the key and calls findActiveKeyByHash with the SHA-256 hash', async () => {
		findActiveKeyByHashMock.mockResolvedValue(MOCK_KEY);
		const rawKey = 'ak_live_' + 'a'.repeat(64);
		const expectedHash = createHash('sha256').update(rawKey).digest('hex');

		const result = await verifyApiKey(rawKey);

		expect(result).toEqual(MOCK_KEY);
		expect(findActiveKeyByHashMock).toHaveBeenCalledWith(expectedHash);
	});

	it('returns null when key is not found in the database', async () => {
		findActiveKeyByHashMock.mockResolvedValue(null);
		const rawKey = 'ak_live_' + 'b'.repeat(64);

		const result = await verifyApiKey(rawKey);

		expect(result).toBeNull();
	});

	it('does not expose the raw key to the repository — only the hash', async () => {
		findActiveKeyByHashMock.mockResolvedValue(MOCK_KEY);
		const rawKey = 'ak_live_' + 'c'.repeat(64);

		await verifyApiKey(rawKey);

		const calledWith = findActiveKeyByHashMock.mock.calls[0][0] as string;
		expect(calledWith).not.toContain('ak_live_');
		expect(calledWith).toHaveLength(64); // SHA-256 hex = 64 chars
	});
});
