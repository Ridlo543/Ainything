import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/server/auth/supabase-client';
import { appEnv } from '$lib/server/config/env';

const passwordSchema = z
	.object({
		password: z.string().min(8, 'Password must be at least 8 characters.'),
		confirm: z.string()
	})
	.refine((d) => d.password === d.confirm, {
		message: 'Passwords do not match.',
		path: ['confirm']
	});

export const load: PageServerLoad = ({ locals }) => {
	// User must have an active recovery session (Supabase sets a session after
	// the recovery link is clicked and exchanged in /auth/callback)
	if (!locals.user) {
		redirect(303, '/auth/forgot-password');
	}
	return {};
};

export const actions: Actions = {
	update: async ({ request, cookies }) => {
		const formData = await request.formData();
		const parsed = passwordSchema.safeParse({
			password: formData.get('password'),
			confirm: formData.get('confirm')
		});

		if (!parsed.success) {
			return fail(422, {
				message: parsed.error.issues[0]?.message ?? 'Invalid input.'
			});
		}

		const supabaseUrl = appEnv.supabaseUrl;
		const supabaseAnonKey = appEnv.supabaseAnonKey;

		if (!supabaseUrl || !supabaseAnonKey) {
			return fail(503, { message: 'Authentication is not configured.' });
		}

		const supabase = createSupabaseServerClient(supabaseUrl, supabaseAnonKey, cookies);
		const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

		if (error) {
			console.error('[update-password] Supabase error:', error.message);
			return fail(400, { message: error.message });
		}

		redirect(303, '/dashboard');
	}
};
