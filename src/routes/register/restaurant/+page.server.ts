import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';
import { authProvider } from '$lib/server/auth/auth-factory';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) {
		redirect(303, '/dashboard');
	}
	return {};
};

const registerSchema = z.object({
	name: z.string().min(1, 'Name is required.').max(100),
	email: z.string().email('Enter a valid email address.'),
	password: z.string().min(8, 'Password must be at least 8 characters.'),
	restaurantName: z.string().min(1, 'Restaurant name is required.').max(100)
});

export const actions: Actions = {
	register: async ({ request }) => {
		const formData = await request.formData();
		const parseResult = registerSchema.safeParse({
			name: formData.get('name'),
			email: formData.get('email'),
			password: formData.get('password'),
			restaurantName: formData.get('restaurantName')
		});

		if (!parseResult.success) {
			return fail(422, {
				message: parseResult.error.issues[0]?.message ?? 'Invalid input.',
				email: String(formData.get('email') ?? ''),
				name: String(formData.get('name') ?? ''),
				restaurantName: String(formData.get('restaurantName') ?? '')
			});
		}

		const { name, email, password } = parseResult.data;

		try {
			await authProvider.register(email, password, name);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Registration failed.';
			return fail(400, {
				message,
				email,
				name,
				restaurantName: parseResult.data.restaurantName
			});
		}

		redirect(303, '/register/confirm');
	}
};
