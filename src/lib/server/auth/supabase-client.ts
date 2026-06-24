import { createServerClient } from '@supabase/ssr';
import type { Cookies } from '@sveltejs/kit';

export function createSupabaseServerClient(
	supabaseUrl: string,
	supabaseAnonKey: string,
	cookies: Cookies
) {
	return createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});
}
