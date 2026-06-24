import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';
import { authProvider } from '$lib/server/auth/auth-factory';
import { appEnv } from '$lib/server/config/env';
import { isOrganizationSlugAvailable } from '$lib/server/repositories/onboarding-repository';

// Local slugify (mirrors onboarding-repository.ts implementation)
function slugify(name: string): string {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
}

const registerSchema = z.object({
	name: z.string().min(1, 'Your name is required.').max(100),
	email: z.string().email('Enter a valid email address.'),
	password: z.string().min(8, 'Password must be at least 8 characters.'),
	organizationName: z.string().min(2, 'Organization name is required.').max(80)
});

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) {
		// Already authenticated — if no membership, go to restaurant setup.
		// If they have a membership, go straight to dashboard.
		if (locals.user.memberships.length > 0) {
			redirect(303, '/dashboard');
		}
		redirect(303, '/register/restaurant/setup');
	}
	return { isMock: appEnv.authProvider === 'mock' };
};

export const actions: Actions = {
	register: async ({ request }) => {
		if (appEnv.authProvider === 'mock') {
			return fail(400, { message: 'Registration is disabled in demo mode.' });
		}

		const formData = await request.formData();
		const parseResult = registerSchema.safeParse({
			name: formData.get('name'),
			email: formData.get('email'),
			password: formData.get('password'),
			organizationName: formData.get('organizationName')
		});

		if (!parseResult.success) {
			return fail(422, {
				message: parseResult.error.issues[0]?.message ?? 'Invalid input.',
				email: String(formData.get('email') ?? ''),
				name: String(formData.get('name') ?? ''),
				organizationName: String(formData.get('organizationName') ?? '')
			});
		}

		const { name, email, password, organizationName } = parseResult.data;

		// Check org slug availability before registering the auth user.
		// Better UX: surface the conflict before creating the auth account.
		if (appEnv.databaseUrl) {
			const orgSlug = slugify(organizationName);
			const orgAvailable = await isOrganizationSlugAvailable(orgSlug).catch(() => true);
			if (!orgAvailable) {
				return fail(400, {
					message: 'That organization name is already taken. Try a different name.',
					email,
					name,
					organizationName
				});
			}
		}

		try {
			await authProvider.register(email, password, name);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Registration failed.';
			return fail(400, { message, email, name, organizationName });
		}

		// After email verification, auth/callback redirects to /register/restaurant/setup
		// which provisions the org + first restaurant in one transaction.
		redirect(303, '/register/confirm');
	}
};
