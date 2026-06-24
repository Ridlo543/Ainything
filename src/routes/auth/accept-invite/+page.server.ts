import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { findInviteByToken, markInviteAccepted } from '$lib/server/repositories/staff-repository';
import { findAppUserByExternalId } from '$lib/server/repositories/user-repository';
import { withTransaction } from '$lib/server/db/postgres';
import { createSupabaseServerClient } from '$lib/server/auth/supabase-client';
import { appEnv } from '$lib/server/config/env';

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
	accept: async ({ request, url, cookies, locals }) => {
		const token = url.searchParams.get('token');
		if (!token) {
			return fail(400, { message: 'Missing invite token.' });
		}

		const invite = await findInviteByToken(token);
		if (!invite) {
			return fail(400, { message: 'This invite link is invalid or has expired.' });
		}

		const supabaseUrl = appEnv.supabaseUrl;
		const supabaseAnonKey = appEnv.supabaseAnonKey;

		if (!supabaseUrl || !supabaseAnonKey) {
			return fail(503, { message: 'Authentication is not configured.' });
		}

		const formData = await request.formData();
		const mode = formData.get('mode')?.toString();

		if (mode === 'register') {
			// New user: register with Supabase, then create membership after verification
			const parsed = registerSchema.safeParse({
				password: formData.get('password'),
				confirm: formData.get('confirm')
			});

			if (!parsed.success) {
				return fail(422, { message: parsed.error.issues[0]?.message ?? 'Invalid input.' });
			}

			const supabase = createSupabaseServerClient(supabaseUrl, supabaseAnonKey, cookies);
			const { error: signUpError } = await supabase.auth.signUp({
				email: invite.email,
				password: parsed.data.password,
				options: {
					// After email verification, callback will detect pending invite by email
					emailRedirectTo: `${appEnv.publicAppUrl}/auth/callback?invite_token=${token}`
				}
			});

			if (signUpError) {
				console.error('[accept-invite] signUp error:', signUpError.message);
				return fail(400, { message: signUpError.message });
			}

			return { sent: true, email: invite.email };
		}

		if (mode === 'login') {
			// Existing user: sign them in, then add membership
			const password = formData.get('password')?.toString() ?? '';
			const supabase = createSupabaseServerClient(supabaseUrl, supabaseAnonKey, cookies);
			const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
				email: invite.email,
				password
			});

			if (signInError || !signInData.user) {
				return fail(401, {
					message: signInError?.message ?? 'Sign in failed.'
				});
			}

			// Find app_user row by external auth id
			const appUser = await findAppUserByExternalId(signInData.user.id);
			if (!appUser) {
				return fail(404, { message: 'Account not found. Please contact support.' });
			}

			// Create membership and mark invite accepted in a single transaction
			await withTransaction(async (client) => {
				// Upsert membership — ignore if already a member
				const { rows: memberRows } = await client.query<{ id: string }>(
					`INSERT INTO memberships (user_id, organization_id, role)
					 VALUES ($1::uuid, $2::uuid, $3)
					 ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role
					 RETURNING id::text`,
					[appUser.id, invite.organization_id, invite.role]
				);
				const membershipId = memberRows[0]!.id;

				// Set as default org if user has none
				await client.query(
					`UPDATE app_users
					 SET default_organization_id = COALESCE(default_organization_id, $1::uuid)
					 WHERE id = $2::uuid`,
					[invite.organization_id, appUser.id]
				);

				// Mark invite accepted
				await client.query('UPDATE invites SET accepted_at = now() WHERE id = $1', [invite.id]);

				return membershipId;
			});

			redirect(303, '/dashboard');
		}

		return fail(400, { message: 'Invalid request.' });
	}
};
