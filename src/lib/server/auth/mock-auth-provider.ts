import type { AppUser } from '$lib/domain/menu/types';
import type { Cookies } from '@sveltejs/kit';
import type { AuthProvider } from './types';
import { getSessionUser, sessionCookieName } from './mock-session';

/**
 * Mock auth provider — wraps the existing HttpOnly demo cookie logic.
 * Used when AUTH_PROVIDER=mock (local development default).
 */
export class MockAuthProvider implements AuthProvider {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async getSessionUser(cookies: Cookies, _request: Request): Promise<AppUser | null> {
		return getSessionUser(cookies.get(sessionCookieName));
	}
}
