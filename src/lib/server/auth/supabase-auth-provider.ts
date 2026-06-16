import type { AppUser } from '$lib/domain/menu/types';
import type { Cookies } from '@sveltejs/kit';
import type { AuthProvider } from './types';

/**
 * Supabase Auth provider stub.
 *
 * This implementation is intentionally incomplete. It is committed as a concrete
 * placeholder so Phase 4 of the auth migration has a clear insertion point:
 *
 *   1. Install `@supabase/supabase-js` and `@supabase/ssr`.
 *   2. Fill in `createSupabaseServerClient` using the SSR cookie helpers.
 *   3. Call `supabase.auth.getUser()` and map the Supabase user to `AppUser`.
 *   4. Set `AUTH_PROVIDER=supabase` in the production environment.
 *
 * Until the above is done, setting AUTH_PROVIDER=supabase will cause every request to
 * return null (anonymous), which will redirect all protected routes to /login — the
 * correct safe default.
 *
 * Do not store the Supabase service role key in this file. It must come from env and
 * stay server-only.
 */
export class SupabaseAuthProvider implements AuthProvider {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async getSessionUser(_cookies: Cookies, _request: Request): Promise<AppUser | null> {
		// TODO (Phase 4 auth migration):
		// const supabase = createSupabaseServerClient(cookies, appEnv.supabaseUrl, appEnv.supabaseAnonKey);
		// const { data: { user }, error } = await supabase.auth.getUser();
		// if (error || !user) return null;
		// return mapSupabaseUserToAppUser(user); // look up app_users by external_auth_id
		console.warn('[SupabaseAuthProvider] Not yet implemented. Returning null (anonymous).');
		return null;
	}
}
