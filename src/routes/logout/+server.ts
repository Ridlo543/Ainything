import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authProvider } from '$lib/server/auth/auth-factory';

export const POST: RequestHandler = async ({ cookies }) => {
	await authProvider.logout(cookies);
	redirect(303, '/login');
};
