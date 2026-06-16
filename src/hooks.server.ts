import type { Handle } from '@sveltejs/kit';
import { authProvider } from '$lib/server/auth/auth-factory';

/**
 * Global server hook. Resolves the authenticated user from the active auth provider
 * (mock cookie in dev, Supabase Auth in production) and stores it in `event.locals`
 * so layouts, server loads, and form actions can read it without re-authenticating.
 *
 * The auth provider is selected via the AUTH_PROVIDER environment variable. Switching
 * from mock to Supabase requires no changes here — only the factory and the Supabase
 * provider implementation need updating.
 */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await authProvider.getSessionUser(event.cookies, event.request);

	return resolve(event);
};
