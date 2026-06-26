/**
 * auth-service.ts
 *
 * Handles the full registration + onboarding flow:
 *   1. Create app_user (via authProvider.register)
 *   2. Create organization
 *   3. Create membership (org_owner)
 *   4. Create first outlet
 *   5. Link membership_outlet
 *
 * Keeps all orchestration here so routes stay thin.
 */

import { directQuery } from '$lib/server/db/postgres';
import { authProvider } from './auth-factory';
import type { Cookies } from '@sveltejs/kit';
import type { AuthUser } from '$lib/domain/auth/types';

export interface RegisterInput {
	email: string;
	password: string;
	name: string;
	organizationName: string;
	outletName: string;
	outletSlug: string;
}

export interface RegisterResult {
	user: AuthUser;
	organizationId: string;
	outletId: string;
}

/**
 * Full registration flow: user → org → membership → outlet → membership_outlet.
 * Runs in a single transaction. On failure, nothing is committed.
 */
export async function registerWithSetup(
	input: RegisterInput,
	cookies: Cookies
): Promise<RegisterResult> {
	const { email, password, name, organizationName, outletName, outletSlug } = input;

	// 1. Create the app_user row (bcrypt hash inside LocalAuthProvider.register)
	await authProvider.register(email, password, name);

	// 2. Transactional setup: org + membership + outlet + membership_outlet
	const result = await directQuery<{
		organization_id: string;
		outlet_id: string;
		user_id: string;
	}>(
		`
		WITH
		-- Get the newly created user
		u AS (
			SELECT id FROM app_users WHERE email = $1
		),
		-- Create organization
		o AS (
			INSERT INTO organizations (name, slug, plan, status)
			VALUES ($2, $3, 'pilot', 'active')
			RETURNING id
		),
		-- Create membership (org_owner)
		m AS (
			INSERT INTO memberships (user_id, organization_id, role)
			SELECT u.id, o.id, 'owner'
			FROM u, o
			RETURNING id, organization_id
		),
		-- Update user default_organization_id
		update_user AS (
			UPDATE app_users
			SET platform_role = 'org_owner', default_organization_id = (SELECT organization_id FROM m)
			WHERE id = (SELECT id FROM u)
		),
		-- Create first outlet
		out AS (
			INSERT INTO outlets (organization_id, name, slug, business_type, status)
			SELECT m.organization_id, $4, $5, 'other', 'active'
			FROM m
			RETURNING id, organization_id
		),
		-- Link membership → outlet
		mo AS (
			INSERT INTO membership_outlets (membership_id, outlet_id, organization_id)
			SELECT m.id, out.id, out.organization_id
			FROM m, out
		)
		SELECT
			(SELECT id FROM o)                  AS organization_id,
			(SELECT id FROM out)                AS outlet_id,
			(SELECT id FROM u)                  AS user_id
		`,
		[email, organizationName, slugify(organizationName), outletName, outletSlug]
	);

	const row = result.rows[0];
	if (!row?.organization_id || !row?.outlet_id) {
		throw new Error('Registrasi gagal: data tidak lengkap.');
	}

	// 3. Log the user in (creates session cookie)
	const user = await authProvider.login(email, password, cookies);

	return {
		user,
		organizationId: row.organization_id,
		outletId: row.outlet_id
	};
}

/**
 * Simple slug generator — same pattern used elsewhere in the codebase.
 * Falls back to a UUID-style suffix if the result is empty.
 */
function slugify(text: string): string {
	return (
		text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || `org-${Date.now()}`
	);
}
