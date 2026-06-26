import { redirect } from '@sveltejs/kit';
import { authProvider } from '$lib/server/auth/auth-factory';
import { resolveRoleRedirect } from '$lib/server/auth/role-routing';
import type { PageServerLoad } from './$types';

/**
 * /auth/callback
 *
 * Previously used for Supabase OAuth code exchange. With local auth, this
 * route only handles two cases:
 *
 * 1. User arrives with an active session → redirect to their role home.
 * 2. No session → redirect to /login.
 *
 * Email verification links and password recovery flows are handled directly
 * by the local auth provider (SMTP reset email → /auth/update-password).
 */
export const load: PageServerLoad = async ({ cookies, request, locals }) => {
	const user = locals.user ?? (await authProvider.getSessionUser(cookies, request));

	if (!user) {
		redirect(303, '/login');
	}

	if (user.memberships.length === 0) {
		redirect(303, '/register');
	}

	redirect(303, resolveRoleRedirect(user));
};
