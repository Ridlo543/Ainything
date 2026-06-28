import { appEnv } from '$lib/server/config/env';
import { LocalAuthProvider } from './local-auth-provider';
import type { AuthProvider } from './types';

/**
 * Returns the active auth provider based on the `AUTH_PROVIDER` env variable.
 *
 * Supported values:
 * - 'credentials' (default) — bcrypt + PostgreSQL sessions. For self-hosted deployments.
 *   Alias: 'local' (legacy name, still accepted).
 * - 'supabase' — Supabase Auth (implementation pending).
 *
 * The factory is called once per server startup (module-level singleton below).
 * Adding a new provider means adding a case here + a new implementation file; no
 * route or hook files need to change.
 *
 * NOTE: The singleton is created lazily (on first access) so that the
 * SvelteKit post-build analyse step — which imports server modules while
 * evaluating prerenderable routes — does not throw for a provider that is
 * configured but not yet implemented.
 * A misconfigured provider will still fail fast on the very first real request.
 */
function createAuthProvider(): AuthProvider {
	const provider = appEnv.authProvider ?? 'credentials';

	switch (provider) {
		case 'credentials':
		case 'local': // legacy alias
			return new LocalAuthProvider();
		case 'supabase':
			// Supabase Auth implementation is on the roadmap.
			// For now fall back to LocalAuthProvider so the build succeeds and
			// local/preview environments work. When the real implementation lands,
			// replace this with: return new SupabaseAuthProvider();
			console.warn(
				'[auth-factory] AUTH_PROVIDER="supabase" is not yet implemented — falling back to LocalAuthProvider. Deploy will fail to authenticate unless this is replaced.'
			);
			return new LocalAuthProvider();
		default:
			throw new Error(
				`[auth-factory] Unknown AUTH_PROVIDER "${provider}". Supported: "credentials", "supabase".`
			);
	}
}

let _instance: AuthProvider | null = null;

/** Lazily-initialised singleton — safe to import at module load time. */
export const authProvider: AuthProvider = new Proxy({} as AuthProvider, {
	get(_target, prop) {
		if (!_instance) _instance = createAuthProvider();
		const value = (_instance as unknown as Record<string | symbol, unknown>)[prop];
		// Bind methods to the instance so private fields (#createSession, #resolveUser)
		// remain accessible — a Proxy receiver breaks private field access in Node v24.
		return typeof value === 'function' ? value.bind(_instance) : value;
	}
});
