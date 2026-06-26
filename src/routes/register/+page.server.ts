import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { registerWithSetup } from '$lib/server/auth/auth-service';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) {
		redirect(303, '/dashboard');
	}
	return {};
};

const registerSchema = z.object({
	name: z.string().min(2, 'Nama minimal 2 karakter.').max(100),
	email: z.string().email('Format email tidak valid.'),
	password: z.string().min(8, 'Password minimal 8 karakter.').max(128),
	businessName: z.string().min(2, 'Nama bisnis minimal 2 karakter.').max(200),
	outletSlug: z
		.string()
		.min(2, 'Slug minimal 2 karakter.')
		.max(60)
		.regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.')
});

export const actions: Actions = {
	register: async ({ request, cookies }) => {
		const formData = await request.formData();

		const raw = {
			name: formData.get('name'),
			email: formData.get('email'),
			password: formData.get('password'),
			businessName: formData.get('businessName'),
			outletSlug: formData.get('outletSlug')
		};

		const parsed = registerSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(422, {
				message: parsed.error.issues[0]?.message ?? 'Input tidak valid.',
				email: String(raw.email ?? ''),
				name: String(raw.name ?? ''),
				businessName: String(raw.businessName ?? ''),
				outletSlug: String(raw.outletSlug ?? '')
			});
		}

		const { name, email, password, businessName, outletSlug } = parsed.data;

		try {
			await registerWithSetup(
				{
					email,
					password,
					name,
					organizationName: businessName,
					outletName: businessName,
					outletSlug
				},
				cookies
			);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Registrasi gagal. Coba lagi.';
			return fail(400, {
				message,
				email,
				name,
				businessName,
				outletSlug
			});
		}

		redirect(303, '/dashboard');
	}
};
