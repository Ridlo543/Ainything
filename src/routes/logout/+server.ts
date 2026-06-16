import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sessionCookieName } from '$lib/server/auth/mock-session';

export const POST: RequestHandler = ({ cookies }) => {
	cookies.delete(sessionCookieName, { path: '/' });
	redirect(303, '/login');
};
