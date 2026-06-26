import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { directQuery } from '$lib/server/db/postgres';

const emailSchema = z.object({
	email: z.string().email('Enter a valid email address.')
});

export const load: PageServerLoad = ({ locals }) => {
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

		// Check user exists (don't reveal if not — return success either way)
		await directQuery(`SELECT id FROM app_users WHERE email = $1`, [email]).catch(() => {});

		// TODO: send password reset email via SMTP when email provider is configured.
		// For now, always return success to prevent email enumeration.
		return { sent: true, email };
	}
};
