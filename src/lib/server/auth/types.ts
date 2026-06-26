import type { AuthUser } from '$lib/domain/auth/types';
import type { Cookies } from '@sveltejs/kit';

export interface AuthProvider {
	/**
	 * Reads the current request's session and returns the authenticated user, or null
	 * if the request is anonymous or the session is invalid.
	 */
	getSessionUser(cookies: Cookies, request: Request): Promise<AuthUser | null>;

	/**
	 * Signs in with email + password. Creates a server-side session cookie.
	 * Throws on invalid credentials.
	 */
	login(email: string, password: string, cookies: Cookies): Promise<AuthUser>;

	/**
	 * Creates a new account. Sends verification email if enabled.
	 * Does NOT automatically sign in — user must verify first.
	 */
	register(email: string, password: string, name: string): Promise<void>;

	/**
	 * Clears the session cookies, signing the user out.
	 */
	logout(cookies: Cookies): Promise<void>;
}
