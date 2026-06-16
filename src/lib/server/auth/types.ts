import type { AppUser } from '$lib/domain/menu/types';
import type { Cookies } from '@sveltejs/kit';

/**
 * Auth provider adapter interface.
 *
 * SvelteKit hooks call `getSessionUser` on every request. The implementation is
 * swapped via the factory in `auth-factory.ts` based on the `AUTH_PROVIDER` env var.
 *
 * This keeps all route/layout/server-load code free from auth-SDK imports and makes
 * the production-auth migration a single factory + implementation change with no
 * route edits required.
 */
export interface AuthProvider {
	/**
	 * Reads the current request's session and returns the authenticated user, or null
	 * if the request is anonymous / the session is invalid.
	 */
	getSessionUser(cookies: Cookies, request: Request): Promise<AppUser | null>;
}
