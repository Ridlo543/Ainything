/**
 * Unit tests for LocalAuthProvider.
 *
 * All DB calls (directQuery) are mocked — no live database needed.
 * Tests cover: login happy path, login failures, getSessionUser,
 * logout (deleteSession), register, and the mapRole helper.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock directQuery before importing the module under test
// ---------------------------------------------------------------------------
const directQueryMock = vi.fn();

vi.mock('$lib/server/db/postgres', () => ({
	directQuery: (...args: unknown[]) => directQueryMock(...args)
}));

// bcryptjs is a real dep — we mock only compare/hash to keep tests fast
vi.mock('bcryptjs', () => ({
	default: {
		compare: vi.fn(),
		hash: vi.fn()
	},
	compare: vi.fn(),
	hash: vi.fn()
}));

import bcrypt from 'bcryptjs';
const bcryptCompare = vi.mocked(bcrypt.compare);
const bcryptHash = vi.mocked(bcrypt.hash);

const { LocalAuthProvider, SESSION_COOKIE, hashPassword } = await import('./local-auth-provider');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCookies(initial: Record<string, string> = {}) {
	const store: Record<string, string> = { ...initial };
	return {
		get: vi.fn((key: string) => store[key] ?? undefined),
		set: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		delete: vi.fn((key: string) => {
			delete store[key];
		}),
		_store: store
	};
}

const USER_ROW = {
	id: 'user-001',
	email: 'owner@bali-table.test',
	name: 'Demo Owner',
	platform_role: 'staff',
	password_hash: '$2b$12$hashedpassword'
};

const MEMBERSHIP_ROW = {
	organization_id: 'org-001',
	outlet_id: 'outlet-001',
	role: 'owner'
};

// ---------------------------------------------------------------------------
describe('LocalAuthProvider — login', () => {
	let provider: InstanceType<typeof LocalAuthProvider>;

	beforeEach(() => {
		provider = new LocalAuthProvider();
		directQueryMock.mockReset();
		bcryptCompare.mockReset();
		bcryptHash.mockReset();
	});

	it('returns AuthUser on valid credentials', async () => {
		// 1. lookup user by email
		directQueryMock.mockResolvedValueOnce({ rows: [USER_ROW] });
		// NOTE: session rotation DELETE is fire-and-forget (.catch(() => {})) — does NOT
		// consume a mockResolvedValueOnce slot because it runs after cookies.get returns null.
		// 2. create session INSERT RETURNING token
		directQueryMock.mockResolvedValueOnce({ rows: [{ token: 'tok-abc' }] });
		// 3. resolve user SELECT
		directQueryMock.mockResolvedValueOnce({ rows: [USER_ROW] });
		// 4. memberships SELECT
		directQueryMock.mockResolvedValueOnce({ rows: [MEMBERSHIP_ROW] });

		bcryptCompare.mockResolvedValueOnce(true as never);

		const cookies = makeCookies();
		const user = await provider.login('owner@bali-table.test', 'demo1234', cookies as never);

		expect(user.email).toBe('owner@bali-table.test');
		expect(user.id).toBe('user-001');
		expect(user.memberships).toHaveLength(1);
		expect(user.memberships[0].role).toBe('org_owner');
		expect(cookies.set).toHaveBeenCalledWith(SESSION_COOKIE, 'tok-abc', expect.any(Object));
	});

	it('throws when user does not exist', async () => {
		directQueryMock.mockResolvedValueOnce({ rows: [] });

		const cookies = makeCookies();
		await expect(provider.login('nobody@test.com', 'x', cookies as never)).rejects.toThrow(
			'Email atau password salah.'
		);
	});

	it('throws when password_hash is null (no-password account)', async () => {
		directQueryMock.mockResolvedValueOnce({
			rows: [{ ...USER_ROW, password_hash: null }]
		});

		const cookies = makeCookies();
		await expect(
			provider.login('owner@bali-table.test', 'demo1234', cookies as never)
		).rejects.toThrow('Akun ini tidak mendukung login dengan password.');
	});

	it('throws on wrong password', async () => {
		directQueryMock.mockResolvedValueOnce({ rows: [USER_ROW] });
		bcryptCompare.mockResolvedValueOnce(false as never);

		const cookies = makeCookies();
		await expect(
			provider.login('owner@bali-table.test', 'wrongpass', cookies as never)
		).rejects.toThrow('Email atau password salah.');
	});

	it('rotates session token when old token exists', async () => {
		const oldToken = 'old-tok-xyz';

		directQueryMock.mockResolvedValueOnce({ rows: [USER_ROW] }); // user lookup
		directQueryMock.mockResolvedValueOnce({ rows: [] }); // delete old session
		directQueryMock.mockResolvedValueOnce({ rows: [{ token: 'new-tok' }] }); // create session
		directQueryMock.mockResolvedValueOnce({ rows: [USER_ROW] }); // resolve user
		directQueryMock.mockResolvedValueOnce({ rows: [MEMBERSHIP_ROW] }); // memberships

		bcryptCompare.mockResolvedValueOnce(true as never);

		const cookies = makeCookies({ [SESSION_COOKIE]: oldToken });
		await provider.login('owner@bali-table.test', 'demo1234', cookies as never);

		// directQuery was called with a DELETE for the old token
		const calls = directQueryMock.mock.calls.map((c) => (c[0] as string).trim());
		const deleteCalled = calls.some(
			(sql) =>
				sql.startsWith('DELETE FROM user_sessions') &&
				directQueryMock.mock.calls.some((c) => c[1]?.includes(oldToken))
		);
		expect(deleteCalled).toBe(true);
	});
});

// ---------------------------------------------------------------------------
describe('LocalAuthProvider — getSessionUser', () => {
	let provider: InstanceType<typeof LocalAuthProvider>;

	beforeEach(() => {
		provider = new LocalAuthProvider();
		directQueryMock.mockReset();
	});

	it('returns null when no cookie present', async () => {
		const cookies = makeCookies();
		const result = await provider.getSessionUser(cookies as never, new Request('http://localhost'));
		expect(result).toBeNull();
		expect(directQueryMock).not.toHaveBeenCalled();
	});

	it('returns null when session not found or expired', async () => {
		directQueryMock.mockResolvedValueOnce({ rows: [] }); // session lookup returns empty

		const cookies = makeCookies({ [SESSION_COOKIE]: 'expired-tok' });
		const result = await provider.getSessionUser(cookies as never, new Request('http://localhost'));
		expect(result).toBeNull();
	});

	it('returns AuthUser for valid session', async () => {
		const futureDate = new Date(Date.now() + 86400_000);

		directQueryMock.mockResolvedValueOnce({
			rows: [{ user_id: 'user-001', expires_at: futureDate }]
		}); // session lookup
		// touch last_seen_at: fire-and-forget, returns nothing relevant
		directQueryMock.mockResolvedValueOnce({ rows: [] });
		// resolve user
		directQueryMock.mockResolvedValueOnce({ rows: [USER_ROW] });
		// memberships
		directQueryMock.mockResolvedValueOnce({ rows: [MEMBERSHIP_ROW] });

		const cookies = makeCookies({ [SESSION_COOKIE]: 'valid-tok' });
		const user = await provider.getSessionUser(cookies as never, new Request('http://localhost'));

		expect(user).not.toBeNull();
		expect(user!.id).toBe('user-001');
		expect(user!.memberships[0].organizationId).toBe('org-001');
	});
});

// ---------------------------------------------------------------------------
describe('LocalAuthProvider — logout (deleteSession)', () => {
	let provider: InstanceType<typeof LocalAuthProvider>;

	beforeEach(() => {
		provider = new LocalAuthProvider();
		directQueryMock.mockReset();
	});

	it('deletes the session and clears the cookie', async () => {
		// logout fires a best-effort DELETE (fire-and-forget), then sets cookie to ''
		directQueryMock.mockResolvedValueOnce({ rows: [] });

		const cookies = makeCookies({ [SESSION_COOKIE]: 'tok-to-delete' });
		await provider.logout(cookies as never);

		// Implementation uses cookies.set(key, '', { maxAge: 0 }) — not cookies.delete
		expect(cookies.set).toHaveBeenCalledWith(
			SESSION_COOKIE,
			'',
			expect.objectContaining({ maxAge: 0 })
		);
		expect(directQueryMock).toHaveBeenCalledWith(
			expect.stringMatching(/DELETE FROM user_sessions/),
			['tok-to-delete']
		);
	});

	it('no-ops when cookie is absent', async () => {
		const cookies = makeCookies();
		await provider.logout(cookies as never);

		// No DB call should be made if there is no token
		expect(directQueryMock).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
describe('LocalAuthProvider — register', () => {
	let provider: InstanceType<typeof LocalAuthProvider>;

	beforeEach(() => {
		provider = new LocalAuthProvider();
		directQueryMock.mockReset();
		bcryptHash.mockReset();
	});

	it('inserts a new user with hashed password', async () => {
		directQueryMock.mockResolvedValueOnce({ rows: [] }); // no existing user
		bcryptHash.mockResolvedValueOnce('$2b$12$newhash' as never);
		directQueryMock.mockResolvedValueOnce({ rows: [] }); // INSERT

		await provider.register('new@test.com', 'password123', 'New User');

		const insertCall = directQueryMock.mock.calls[1];
		expect(insertCall[0]).toMatch(/INSERT INTO app_users/);
		expect(insertCall[1]).toContain('local:new@test.com');
		expect(insertCall[1]).toContain('new@test.com');
		expect(insertCall[1]).toContain('New User');
	});

	it('throws on duplicate email', async () => {
		directQueryMock.mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] });

		await expect(provider.register('owner@bali-table.test', 'pass', 'Dupe')).rejects.toThrow(
			'Email sudah terdaftar.'
		);
	});
});

// ---------------------------------------------------------------------------
describe('LocalAuthProvider — membership grouping (multi-outlet)', () => {
	let provider: InstanceType<typeof LocalAuthProvider>;

	beforeEach(() => {
		provider = new LocalAuthProvider();
		directQueryMock.mockReset();
		bcryptCompare.mockReset();
	});

	it('merges multiple outlets from the same org into one membership', async () => {
		// cookies has no token → fire-and-forget DELETE does NOT run → no extra mock slot
		directQueryMock.mockResolvedValueOnce({ rows: [USER_ROW] }); // 1. user lookup
		directQueryMock.mockResolvedValueOnce({ rows: [{ token: 'tok' }] }); // 2. create session
		directQueryMock.mockResolvedValueOnce({ rows: [USER_ROW] }); // 3. resolve user
		// 4. Two outlets, same org, same role
		directQueryMock.mockResolvedValueOnce({
			rows: [
				{ organization_id: 'org-001', outlet_id: 'outlet-001', role: 'owner' },
				{ organization_id: 'org-001', outlet_id: 'outlet-002', role: 'owner' }
			]
		});

		bcryptCompare.mockResolvedValueOnce(true as never);

		const cookies = makeCookies();
		const user = await provider.login('owner@bali-table.test', 'demo1234', cookies as never);

		expect(user.memberships).toHaveLength(1);
		expect(user.memberships[0].outletIds).toEqual(['outlet-001', 'outlet-002']);
	});
});

// ---------------------------------------------------------------------------
describe('hashPassword helper', () => {
	it('calls bcrypt.hash with 12 rounds', async () => {
		bcryptHash.mockResolvedValueOnce('$2b$12$hashed' as never);
		const result = await hashPassword('plain');
		expect(bcryptHash).toHaveBeenCalledWith('plain', 12);
		expect(result).toBe('$2b$12$hashed');
	});
});
