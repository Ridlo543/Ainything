/**
 * Post-registration setup wizard.
 *
 * Three optional steps:
 *   1. Add first product
 *   2. Generate QR code (client-side)
 *   3. Invite staff
 *
 * Each step can be skipped. Completing or skipping all steps redirects to /dashboard.
 */

import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';
import { addMenuItem } from '$lib/server/services/menu-admin-service';
import { inviteStaff } from '$lib/server/services/staff-management-service';
import { appEnv } from '$lib/server/config/env';

const addProductSchema = z.object({
	name: z.string().min(1, 'Product name is required.').max(200),
	price: z.coerce.number().int().min(0, 'Price must be 0 or more.').max(10_000_000),
	category: z.string().min(1, 'Category is required.').max(100),
	description: z.string().max(500).default('')
});

const inviteSchema = z.object({
	email: z.string().email('Invalid email address.'),
	role: z.enum(['manager', 'staff'], { message: 'Select a valid role.' })
});

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/login');
	}

	if (locals.user.memberships.length === 0) {
		redirect(303, '/register/restaurant/setup');
	}

	try {
		const tenant = await resolveTenantContext(locals.user);
		return {
			tenant: {
				organization: tenant.organization,
				activeRestaurant: tenant.activeRestaurant,
				membership: tenant.membership
			},
			publicAppUrl: appEnv.publicAppUrl
		};
	} catch {
		redirect(303, '/dashboard');
	}
};

export const actions: Actions = {
	addProduct: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(303, '/login');
		}

		const formData = await request.formData();
		const raw = {
			name: formData.get('name'),
			price: formData.get('price'),
			category: formData.get('category'),
			description: formData.get('description') ?? ''
		};

		const parsed = addProductSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(422, {
				message: parsed.error.issues[0]?.message ?? 'Invalid input.',
				step: 'product',
				...raw
			});
		}

		const tenant = await resolveTenantContext(locals.user);

		try {
			await addMenuItem(locals.user, {
				restaurantSlug: tenant.activeRestaurant.slug,
				name: parsed.data.name,
				price: parsed.data.price,
				category: parsed.data.category,
				description: parsed.data.description
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to add product.';
			return fail(500, { message, step: 'product', ...raw });
		}

		return { success: true, step: 'product' };
	},

	inviteStaff: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(303, '/login');
		}

		const formData = await request.formData();
		const raw = {
			email: formData.get('email'),
			role: formData.get('role')
		};

		const parsed = inviteSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(422, {
				message: parsed.error.issues[0]?.message ?? 'Invalid input.',
				step: 'staff',
				...raw
			});
		}

		const tenant = await resolveTenantContext(locals.user);

		try {
			await inviteStaff({
				organizationId: tenant.organization.id,
				invitedByUserId: locals.user.id,
				inviterName: locals.user.name,
				organizationName: tenant.organization.name,
				email: parsed.data.email,
				role: parsed.data.role,
				appUrl: appEnv.publicAppUrl
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to send invite.';
			return fail(500, { message, step: 'staff', ...raw });
		}

		return { success: true, step: 'staff' };
	},

	skip: async () => {
		redirect(303, '/dashboard');
	}
};
