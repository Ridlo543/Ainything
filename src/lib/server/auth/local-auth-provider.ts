import bcrypt from 'bcryptjs';
import type { AuthUser, OrgMembership, PlatformRole } from '$lib/domain/auth/types';
import type { Cookies } from '@sveltejs/kit';
import type { AuthProvider } from './types';
import { directQuery } from '$lib/server/db/postgres';

// ---------------------------------------------------------------------------
// Session cookie config
// ---------------------------------------------------------------------------
export const SESSION_COOKIE = 'ain_session';

const COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: process.env.NODE_ENV === 'production',
	maxAge: 60 * 60 * 24 * 30 // 30 days
};

// ---------------------------------------------------------------------------
// Row types (internal)
// ---------------------------------------------------------------------------
interface SessionRow {
	user_id: string;
	expires_at: Date;
}

interface UserRow {
	id: string;
	external_auth_id: string;
	email: string;
	name: string;
	platform_role: string;
	password_hash: string | null;
}

interface MembershipRow {
	organization_id: string;
	outlet_id: string;
	role: string;
}

// ---------------------------------------------------------------------------
// LocalAuthProvider
//
// Uses server-side sessions stored in `user_sessions` (PostgreSQL).
// All session lookups use directQuery (superuser) because sessions are
// resolved before any user context exists — RLS cannot apply here.
// ---------------------------------------------------------------------------
export class LocalAuthProvider implements AuthProvider {
	// -------------------------------------------------------------------------
	// getSessionUser — called on every request by hooks.server.ts
	// -------------------------------------------------------------------------
	async getSessionUser(cookies: Cookies, _request: Request): Promise<AuthUser | null> {
		const token = cookies.get(SESSION_COOKIE);
		if (!token) return null;

		// Use direct (superuser) connection — session table has no RLS
		const sessionResult = await directQuery<SessionRow>(
			`SELECT user_id, expires_at
			 FROM user_sessions
			 WHERE token = $1 AND expires_at > now()`,
			[token]
		);

		const session = sessionResult.rows[0];
		if (!session) return null;

		// Touch last_seen_at (best-effort, don't fail the request if it errors)
		directQuery(`UPDATE user_sessions SET last_seen_at = now() WHERE token = $1`, [token]).catch(
			() => {}
		);

		return this.#resolveUser(session.user_id);
	}

	// -------------------------------------------------------------------------
	// login
	// -------------------------------------------------------------------------
	async login(email: string, password: string, cookies: Cookies): Promise<AuthUser> {
		const userResult = await directQuery<UserRow>(
			`SELECT id, email, name, platform_role, password_hash
			 FROM app_users
			 WHERE email = $1`,
			[email]
		);

		const user = userResult.rows[0];
		if (!user) {
			throw new Error('Email atau password salah.');
		}

		if (!user.password_hash) {
			throw new Error('Akun ini tidak mendukung login dengan password.');
		}

		const valid = bcrypt.compareSync(password, user.password_hash);
		if (!valid) {
			throw new Error('Email atau password salah.');
		}

		// Session rotation: invalidate any existing session before issuing a new one.
		// Prevents session fixation — an old stolen token can no longer be used after login.
		const oldToken = cookies.get(SESSION_COOKIE);
		if (oldToken) {
			directQuery(`DELETE FROM user_sessions WHERE token = $1`, [oldToken]).catch(() => {});
		}

		const token = await this.#createSession(user.id);
		cookies.set(SESSION_COOKIE, token, COOKIE_OPTIONS);

		return this.#resolveUser(user.id);
	}

	// -------------------------------------------------------------------------
	// register — creates app_user row only; org/outlet setup is handled by
	// auth-service.ts after registration
	// -------------------------------------------------------------------------
	async register(email: string, password: string, name: string): Promise<void> {
		// Check for duplicate email first (friendly error)
		const existing = await directQuery<{ id: string }>(
			`SELECT id FROM app_users WHERE email = $1`,
			[email]
		);
		if (existing.rows.length > 0) {
			throw new Error('Email sudah terdaftar.');
		}

		const BCRYPT_ROUNDS = 12;
		const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

		// external_auth_id uses email as identifier for local auth accounts
		await directQuery(
			`INSERT INTO app_users (external_auth_id, email, name, platform_role, password_hash)
			 VALUES ($1, $2, $3, 'staff', $4)`,
			[`local:${email}`, email, name, hash]
		);
	}

	// -------------------------------------------------------------------------
	// logout
	// -------------------------------------------------------------------------
	async logout(cookies: Cookies): Promise<void> {
		const token = cookies.get(SESSION_COOKIE);
		if (token) {
			// Best-effort delete — don't fail logout if DB is down
			directQuery(`DELETE FROM user_sessions WHERE token = $1`, [token]).catch(() => {});
		}
		cookies.set(SESSION_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	async #createSession(userId: string): Promise<string> {
		const result = await directQuery<{ token: string }>(
			`INSERT INTO user_sessions (user_id)
			 VALUES ($1)
			 RETURNING token`,
			[userId]
		);
		const token = result.rows[0]?.token;
		if (!token) throw new Error('Failed to create session.');
		return token;
	}

	async #resolveUser(userId: string): Promise<AuthUser> {
		// Use directQuery for user lookup — called from session resolution path
		// where app.user_external_id is not yet set
		const userResult = await directQuery<UserRow>(
			`SELECT id, external_auth_id, email, name, platform_role FROM app_users WHERE id = $1`,
			[userId]
		);
		const user = userResult.rows[0];
		if (!user) throw new Error('User not found.');

		const membershipResult = await directQuery<MembershipRow>(
			`SELECT mo.organization_id, mo.outlet_id, m.role
			 FROM membership_outlets mo
			 JOIN memberships m ON m.id = mo.membership_id
			 WHERE m.user_id = $1`,
			[userId]
		);

		// Group outlet IDs by organization
		const grouped = new Map<string, OrgMembership>();
		for (const row of membershipResult.rows) {
			const existing = grouped.get(row.organization_id);
			if (existing) {
				existing.outletIds.push(row.outlet_id);
			} else {
				grouped.set(row.organization_id, {
					organizationId: row.organization_id,
					outletIds: [row.outlet_id],
					role: mapRole(row.role)
				});
			}
		}

		return {
			// Use external_auth_id as the AuthUser.id — this is what withUserContext sets
			// as app.user_external_id GUC, and what loadMembership queries via
			// WHERE u.external_auth_id = $1. The internal UUID must not be used here.
			id: user.external_auth_id,
			email: user.email,
			name: user.name,
			platformRole: user.platform_role as PlatformRole,
			memberships: Array.from(grouped.values())
		};
	}
}

function mapRole(role: string): Exclude<PlatformRole, 'super_admin'> {
	switch (role) {
		case 'owner':
			return 'org_owner';
		case 'manager':
			return 'outlet_admin';
		default:
			return 'staff';
	}
}

// ---------------------------------------------------------------------------
// Exported helper: hash a password (used in seed / auth-service)
// ---------------------------------------------------------------------------
export async function hashPassword(plain: string): Promise<string> {
	return bcrypt.hash(plain, 12);
}
