import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';
import {
	getDefaultSessionId,
	getDemoSessions,
	sessionCookieName
} from '$lib/server/auth/mock-session';

const loginFormSchema = z.object({
	sessionId: z.string().min(1, 'Please select a demo account.'),
	redirectTo: z.string().max(256).default('/dashboard')
});

const cookieOptions = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	secure: false,
	maxAge: 60 * 60 * 24 * 7
} as const;

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user && url.searchParams.get('redirectTo')) {
		redirect(303, url.searchParams.get('redirectTo') ?? '/dashboard');
	}

	return {
		demoSessions: getDemoSessions(),
		defaultSessionId: getDefaultSessionId(),
		redirectTo: url.searchParams.get('redirectTo') ?? '/dashboard'
	};
};

export const actions: Actions = {
login: async ({ cookies, request }) => {
			const formData = await request.formData();
			const parseResult = loginFormSchema.safeParse({
				sessionId: formData.get('sessionId'),
				redirectTo: formData.get('redirectTo')
			});

			if (!parseResult.success) {
				return fail(422, { message: parseResult.error.issues[0]?.message ?? 'Invalid input.' });
			}

			const { sessionId, redirectTo } = parseResult.data;

			const session = getDemoSessions().find((item) => item.id === sessionId);

			if (!session) {
				return fail(400, {
					message: 'Choose a valid demo account.'
				});
			}

			cookies.set(sessionCookieName, session.id, cookieOptions);

			redirect(303, redirectTo.startsWith('/') ? redirectTo : '/dashboard');
		}
};
