import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { directQuery } from '$lib/server/db/postgres';
import bcrypt from 'bcryptjs';

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
	if (!locals.user) {
		redirect(303, '/auth/forgot-password');
	}
	return {};
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(303, '/auth/forgot-password');
		}

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

		const hash = await bcrypt.hash(parsed.data.password, 12);

		await directQuery(`UPDATE app_users SET password_hash = $1 WHERE id = $2::uuid`, [
			hash,
			locals.user.id
		]);

		redirect(303, '/dashboard');
	}
};
