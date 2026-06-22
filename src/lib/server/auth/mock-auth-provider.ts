import type { AuthUser } from '$lib/domain/auth/types';
import type { Cookies } from '@sveltejs/kit';
import type { AuthProvider } from './types';
import { getSessionUser, sessionCookieName, mapDemoUserToAuthUser } from './mock-session';
import { demoUsers } from '$lib/mock/restaurants';

const cookieOptions = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: false,
	maxAge: 60 * 60 * 24 * 7
};

export class MockAuthProvider implements AuthProvider {
	async getSessionUser(cookies: Cookies, _request: Request): Promise<AuthUser | null> {
		return getSessionUser(cookies.get(sessionCookieName));
	}

	async login(email: string, _password: string, cookies: Cookies): Promise<AuthUser> {
		const user = demoUsers.find((u) => u.email === email);
		if (!user) {
			throw new Error('Demo user not found. Try owner@bali-table.test or staff@jakarta-hospitality.test');
		}

		const session = `demo-${user.id}-session`;
		cookies.set(sessionCookieName, session, cookieOptions);

		return user;
	}

	async register(_email: string, _password: string, _name: string): Promise<void> {
	}

	async logout(cookies: Cookies): Promise<void> {
		cookies.set(sessionCookieName, '', { ...cookieOptions, maxAge: 0 });
	}
}
