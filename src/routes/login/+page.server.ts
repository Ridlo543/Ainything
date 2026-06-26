import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';
import { authProvider } from '$lib/server/auth/auth-factory';
import { resolveRoleRedirect } from '$lib/server/auth/role-routing';
import { applyLoginRateLimit } from '$lib/server/services/public-api-helpers';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) {
		const redirectTo = url.searchParams.get('redirectTo');
		if (redirectTo && redirectTo.startsWith('/')) {
			redirect(303, redirectTo);
		}
		// Authenticated user with no explicit redirectTo — send to their role home.
		redirect(303, resolveRoleRedirect(locals.user));
	}

	return {
		redirectTo: url.searchParams.get('redirectTo') ?? '/dashboard'
	};
};

const loginSchema = z.object({
	email: z.string().email('Enter a valid email address.'),
	password: z.string().min(1, 'Password is required.'),
	redirectTo: z.string().max(256).default('/dashboard')
});

export const actions: Actions = {
	login: async ({ cookies, request, url }) => {
		// Rate limit: 5 attempts per 300s per IP — brute-force protection
		await applyLoginRateLimit(request);

		const formData = await request.formData();
		const parseResult = loginSchema.safeParse({
			email: formData.get('email'),
			password: formData.get('password'),
			redirectTo: formData.get('redirectTo') ?? url.searchParams.get('redirectTo')
		});

		if (!parseResult.success) {
			return fail(422, {
				message: parseResult.error.issues[0]?.message ?? 'Invalid input.',
				email: String(formData.get('email') ?? '')
			});
		}

		const { email, password, redirectTo } = parseResult.data;

		try {
			await authProvider.login(email, password, cookies);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Login failed.';
			return fail(401, { message, email });
		}

		const user = await authProvider.getSessionUser(cookies, request);
		const target = user ? resolveRoleRedirect(user) : '/dashboard';
		const safeRedirect =
			redirectTo.startsWith('/') && redirectTo !== '/dashboard' ? redirectTo : target;
		redirect(303, safeRedirect);
	}
};
