import { error, redirect } from '@sveltejs/kit';
import { authProvider } from '$lib/server/auth/auth-factory';
import { createSupabaseServerClient } from '$lib/server/auth/supabase-client';
import { resolveRoleRedirect } from '$lib/server/auth/role-routing';
import { appEnv } from '$lib/server/config/env';
import { findAppUserByExternalId } from '$lib/server/repositories/user-repository';
import type { PageServerLoad } from './$types';

async function assertAppUserExists(authUserId: string) {
	try {
		const user = await findAppUserByExternalId(authUserId);

		if (!user) {
			console.warn(`[auth callback] app_users row missing for auth user ${authUserId}`);
			error(503, 'Your account profile is not ready. Please contact support.');
		}
	} catch (err) {
		console.error('[auth callback] Database unavailable while verifying user profile', err);
		error(503, 'Account verification is temporarily unavailable. Please try again later.');
	}
}

export const load: PageServerLoad = async ({ url, cookies, request, locals }) => {
	const code = url.searchParams.get('code');

	if (code) {
		const supabaseUrl = appEnv.supabaseUrl;
		const supabaseAnonKey = appEnv.supabaseAnonKey;

		if (!supabaseUrl || !supabaseAnonKey) {
			error(503, 'Authentication is not configured.');
		}

		const supabase = createSupabaseServerClient(supabaseUrl, supabaseAnonKey, cookies);
		const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

		if (exchangeError) {
			console.error('[auth callback] Could not exchange code for session', exchangeError);
			error(500, 'Could not complete email verification.');
		}

		const { data: authData, error: authError } = await supabase.auth.getUser();

		if (authError || !authData.user) {
			console.error('[auth callback] Authentication session was not created', authError);
			error(500, 'Authentication session was not created.');
		}

		await assertAppUserExists(authData.user.id);
	}

	const user = locals.user ?? (await authProvider.getSessionUser(cookies, request));

	if (!user) {
		redirect(303, '/login');
	}

	redirect(303, resolveRoleRedirect(user));
};
