import type { Handle } from '@sveltejs/kit';
import { authProvider } from '$lib/server/auth/auth-factory';
import { detectLanguage } from '$lib/i18n/detection';
import type { LanguageTag } from '$lib/domain/menu/types';

/**
 * Global server hook. Resolves the authenticated user from the active auth provider
 * (mock cookie in dev, Supabase Auth in production) and stores it in `event.locals`
 * so layouts, server loads, and form actions can read it without re-authenticating.
 *
 * Also resolves the guest language from the Accept-Language header. The resolved tag
 * is stored in `event.locals.language` so public routes (no auth) and admin routes
 * can pre-select the appropriate translation dictionary.
 *
 * The auth provider is selected via the AUTH_PROVIDER environment variable. Switching
 * from mock to Supabase requires no changes here — only the factory and the Supabase
 * provider implementation need updating.
 */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await authProvider.getSessionUser(event.cookies, event.request);

	// Resolve guest/staff language from Accept-Language header.
	// Falls back to English when header is missing or unrecognized.
	const acceptLang = event.request.headers.get('accept-language');
	event.locals.language = detectLanguage(acceptLang) satisfies LanguageTag;

	return resolve(event);
};
