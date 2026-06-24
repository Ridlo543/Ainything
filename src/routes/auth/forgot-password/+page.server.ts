import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/server/auth/supabase-client';
import { appEnv } from '$lib/server/config/env';

const emailSchema = z.object({
	email: z.string().email('Enter a valid email address.')
});

export const load: PageServerLoad = ({ locals }) => {
	// Already logged in — no need to reset
	if (locals.user) {
		return { alreadyLoggedIn: true };
	}
	return { alreadyLoggedIn: false };
};

export const actions: Actions = {
	reset: async ({ request }) => {
		const formData = await request.formData();
		const parsed = emailSchema.safeParse({ email: formData.get('email') });

		if (!parsed.success) {
			return fail(422, {
				message: parsed.error.issues[0]?.message ?? 'Invalid email.',
				email: String(formData.get('email') ?? '')
			});
		}

		const { email } = parsed.data;

		if (appEnv.authProvider === 'mock') {
			// In mock mode, just pretend it worked
			return { sent: true, email };
		}

		const supabaseUrl = appEnv.supabaseUrl;
		const supabaseAnonKey = appEnv.supabaseAnonKey;

		if (!supabaseUrl || !supabaseAnonKey) {
			return fail(503, { message: 'Authentication is not configured.', email });
		}

		const { createClient } = await import('@supabase/supabase-js');
		const supabase = createClient(supabaseUrl, supabaseAnonKey);

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${appEnv.publicAppUrl}/auth/callback?type=recovery`
		});

		if (error) {
			console.error('[forgot-password] Supabase reset error:', error.message);
			// Do not reveal whether the email exists — always return success
		}

		// Always show success to prevent email enumeration
		return { sent: true, email };
	}
};
