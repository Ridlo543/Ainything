import { createClient } from '@supabase/supabase-js';
import type { AuthUser, PlatformRole, OrgMembership } from '$lib/domain/auth/types';
import type { Cookies } from '@sveltejs/kit';
import type { AuthProvider } from './types';
import { createSupabaseServerClient } from './supabase-client';
import { appEnv } from '$lib/server/config/env';
import pg from 'pg';

export class SupabaseAuthProvider implements AuthProvider {
	async getSessionUser(cookies: Cookies, _request: Request): Promise<AuthUser | null> {
		void _request;
		const supabaseUrl = appEnv.supabaseUrl;
		const supabaseAnonKey = appEnv.supabaseAnonKey;
		if (!supabaseUrl || !supabaseAnonKey) {
			return null;
		}

		const supabase = createSupabaseServerClient(supabaseUrl, supabaseAnonKey, cookies);
		const { data, error } = await supabase.auth.getUser();
		if (error || !data.user) return null;

		return this.#resolveAuthUser(
			data.user.id,
			data.user.email!,
			data.user.user_metadata.name ?? ''
		);
	}

	async login(email: string, password: string, cookies: Cookies): Promise<AuthUser> {
		const supabaseUrl = appEnv.supabaseUrl;
		const supabaseAnonKey = appEnv.supabaseAnonKey;
		if (!supabaseUrl || !supabaseAnonKey) {
			throw new Error('Supabase is not configured.');
		}

		const supabase = createSupabaseServerClient(supabaseUrl, supabaseAnonKey, cookies);
		const { data, error } = await supabase.auth.signInWithPassword({ email, password });
		if (error || !data.user) {
			throw new Error(error?.message ?? 'Invalid credentials.');
		}

		return this.#resolveAuthUser(
			data.user.id,
			data.user.email!,
			data.user.user_metadata.name ?? ''
		);
	}

	async register(email: string, password: string, name: string): Promise<void> {
		const supabaseUrl = appEnv.supabaseUrl;
		const supabaseAnonKey = appEnv.supabaseAnonKey;
		if (!supabaseUrl || !supabaseAnonKey) {
			throw new Error('Supabase is not configured.');
		}

		const supabase = createClient(appEnv.supabaseUrl!, appEnv.supabaseAnonKey!);
		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: { name },
				emailRedirectTo: `${appEnv.publicAppUrl}/auth/callback`
			}
		});

		if (error) throw new Error(error.message);
	}

	async logout(cookies: Cookies): Promise<void> {
		const supabaseUrl = appEnv.supabaseUrl;
		const supabaseAnonKey = appEnv.supabaseAnonKey;
		if (!supabaseUrl || !supabaseAnonKey) {
			return;
		}

		const supabase = createSupabaseServerClient(supabaseUrl, supabaseAnonKey, cookies);
		await supabase.auth.signOut();
	}

	/**
	 * Resolves a full AuthUser from a Supabase auth user by querying the app_users
	 * table and memberships. Falls back to a minimal user if the database is unreachable.
	 */
	async #resolveAuthUser(authId: string, email: string, name: string): Promise<AuthUser> {
		try {
			const { platformRole, memberships } = await this.#fetchUserProfile(authId);
			return {
				id: authId,
				email,
				name,
				platformRole,
				memberships
			};
		} catch (err) {
			console.warn('[SupabaseAuthProvider] Could not resolve user profile from DB:', err);
			return {
				id: authId,
				email,
				name,
				platformRole: 'staff',
				memberships: []
			};
		}
	}

	async #fetchUserProfile(
		authId: string
	): Promise<{ platformRole: PlatformRole; memberships: OrgMembership[] }> {
		if (!appEnv.databaseUrl) {
			return { platformRole: 'staff', memberships: [] };
		}

		const { Pool } = pg;
		const pool = new Pool({
			connectionString: appEnv.databaseUrl,
			max: 1
		});

		try {
			const { rows } = await pool.query<{ platform_role: string }>(
				`SELECT platform_role FROM app_users WHERE external_auth_id = $1`,
				[authId]
			);

			const platformRole = (rows[0]?.platform_role ?? 'staff') as PlatformRole;

			const { rows: membershipRows } = await pool.query<{
				organization_id: string;
				restaurant_id: string;
				role: string;
			}>(...this.#membershipsQuery(authId));

			const grouped = new Map<string, OrgMembership>();
			for (const row of membershipRows) {
				const existing = grouped.get(row.organization_id);
				const mappedRole = mapMembershipRole(row.role);
				if (existing) {
					existing.restaurantIds.push(row.restaurant_id);
				} else {
					grouped.set(row.organization_id, {
						organizationId: row.organization_id,
						restaurantIds: [row.restaurant_id],
						role: mappedRole
					});
				}
			}

			return { platformRole, memberships: Array.from(grouped.values()) };
		} finally {
			await pool.end();
		}
	}

	#membershipsQuery(authId: string): [string, string[]] {
		return [
			`SELECT m.organization_id, m.restaurant_id, m.role
			 FROM memberships m
			 JOIN app_users u ON u.id = m.user_id
			 WHERE u.external_auth_id = $1`,
			[authId]
		];
	}
}

function mapMembershipRole(role: string): Exclude<PlatformRole, 'super_admin'> {
	switch (role) {
		case 'owner':
			return 'org_owner';
		case 'manager':
			return 'restaurant_admin';
		case 'staff':
			return 'staff';
		default:
			return 'staff';
	}
}
