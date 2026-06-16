import { appEnv } from '$lib/server/config/env';
import { MockAuthProvider } from './mock-auth-provider';
import { SupabaseAuthProvider } from './supabase-auth-provider';
import type { AuthProvider } from './types';

/**
 * Returns the active auth provider based on the `AUTH_PROVIDER` env variable.
 *
 * Supported values:
 * - 'mock'     (default) HttpOnly demo cookie. For local development only.
 * - 'supabase' Supabase Auth via SSR cookies. Set in staging/production.
 *
 * The factory is called once per server startup (module-level singleton below).
 * Adding a new provider means adding a case here + a new implementation file; no
 * route or hook files need to change.
 */
function createAuthProvider(): AuthProvider {
	const provider = appEnv.authProvider ?? 'mock';

	switch (provider) {
		case 'supabase':
			return new SupabaseAuthProvider();
		case 'mock':
			return new MockAuthProvider();
		default:
			console.warn(`[auth-factory] Unknown AUTH_PROVIDER "${provider}", falling back to mock.`);
			return new MockAuthProvider();
	}
}

export const authProvider: AuthProvider = createAuthProvider();
