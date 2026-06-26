import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { findInviteByToken } from '$lib/server/repositories/staff-repository';
import { findAppUserByExternalId } from '$lib/server/repositories/user-repository';
import { withTransaction, directQuery } from '$lib/server/db/postgres';
import { authProvider } from '$lib/server/auth/auth-factory';

const registerSchema = z
	.object({
		password: z.string().min(8, 'Password must be at least 8 characters.'),
		confirm: z.string()
	})
	.refine((d) => d.password === d.confirm, {
		message: 'Passwords do not match.',
		path: ['confirm']
	});

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return { invite: null, error: 'Missing invite token.' };
	}

	const invite = await findInviteByToken(token);

	if (!invite) {
		return { invite: null, error: 'This invite link is invalid or has expired.' };
	}

	return {
		invite: {
			id: invite.id,
			email: invite.email,
			role: invite.role,
			organizationId: invite.organization_id,
			expiresAt: invite.expires_at
		},
		error: null
	};
};

export const actions: Actions = {
	accept: async ({ request, url, cookies }) => {
		const token = url.searchParams.get('token');
		if (!token) {
			return fail(400, { message: 'Missing invite token.' });
		}

		const invite = await findInviteByToken(token);
		if (!invite) {
			return fail(400, { message: 'This invite link is invalid or has expired.' });
		}

		const formData = await request.formData();
		const mode = formData.get('mode')?.toString();

		if (mode === 'register') {
			// New user: create local account, then link to the organization
			const parsed = registerSchema.safeParse({
				password: formData.get('password'),
				confirm: formData.get('confirm')
			});

			if (!parsed.success) {
				return fail(422, { message: parsed.error.issues[0]?.message ?? 'Invalid input.' });
			}

			try {
				// Register the user (LocalAuthProvider creates app_user row)
				await authProvider.register(invite.email, parsed.data.password, '');
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Registration failed.';
				return fail(400, { message });
			}

			// Get the newly created user
			const newUser = await directQuery<{ id: string }>(
				`SELECT id FROM app_users WHERE email = $1`,
				[invite.email]
			);
			const userId = newUser.rows[0]?.id;
			if (!userId) return fail(500, { message: 'Account not found after registration.' });

			await _acceptInviteMembership(userId, invite);

			// Auto-login
			await authProvider.login(invite.email, parsed.data.password, cookies);
			redirect(303, '/dashboard');
		}

		if (mode === 'login') {
			// Existing user: sign in, then add membership
			const password = formData.get('password')?.toString() ?? '';

			try {
				await authProvider.login(invite.email, password, cookies);
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Sign in failed.';
				return fail(401, { message });
			}

			const appUser = await findAppUserByExternalId(`local:${invite.email}`);
			if (!appUser) {
				return fail(404, { message: 'Account not found. Please contact support.' });
			}

			await _acceptInviteMembership(appUser.id, invite);
			redirect(303, '/dashboard');
		}

		return fail(400, { message: 'Invalid request.' });
	}
};

async function _acceptInviteMembership(
	userId: string,
	invite: { id: string; organization_id: string; role: string }
) {
	await withTransaction(async (client) => {
		const { rows: memberRows } = await client.query<{ id: string }>(
			`INSERT INTO memberships (user_id, organization_id, role)
			 VALUES ($1::uuid, $2::uuid, $3)
			 ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role
			 RETURNING id::text`,
			[userId, invite.organization_id, invite.role]
		);
		const membershipId = memberRows[0]!.id;

		await client.query(
			`UPDATE app_users
			 SET default_organization_id = COALESCE(default_organization_id, $1::uuid),
			     platform_role = CASE WHEN platform_role = 'staff' THEN
			       CASE $2 WHEN 'owner' THEN 'org_owner' WHEN 'manager' THEN 'outlet_admin' ELSE 'staff' END
			     ELSE platform_role END
			 WHERE id = $3::uuid`,
			[invite.organization_id, invite.role, userId]
		);

		await client.query('UPDATE invites SET accepted_at = now() WHERE id = $1', [invite.id]);
		return membershipId;
	});
}
