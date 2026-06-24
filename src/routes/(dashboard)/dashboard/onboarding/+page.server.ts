import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { z } from 'zod';
import { createTablesForRestaurant } from '$lib/server/repositories/table-repository';
import { createDraftMenu } from '$lib/server/repositories/onboarding-repository';
import { appEnv } from '$lib/server/config/env';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const setupTablesSchema = z.object({
	count: z
		.string()
		.transform(Number)
		.pipe(z.number().int().min(1, 'Minimum 1 table').max(200, 'Maximum 200 tables')),
	prefix: z
		.string()
		.max(4, 'Prefix too long')
		.regex(/^[A-Za-z]+$/, 'Prefix must be letters only')
		.default('T'),
	restaurantId: z.string().uuid('Invalid restaurant ID'),
	organizationId: z.string().uuid('Invalid organization ID')
});

const createDraftMenuSchema = z.object({
	restaurantId: z.string().uuid('Invalid restaurant ID'),
	organizationId: z.string().uuid('Invalid organization ID')
});

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export const load: PageServerLoad = async ({ parent, url }) => {
	const { tenant } = await parent();
	const step = Number(url.searchParams.get('step') ?? '1');
	return { tenant, step };
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const actions: Actions = {
	/**
	 * Step 2: bulk-create tables for the active restaurant.
	 * Redirects to step=3 on success.
	 */
	setupTables: async ({ request, locals }) => {
		// C2: auth guard — layout load() does not cover form actions
		if (!locals.user) return fail(401, { action: 'setupTables', error: 'Unauthorized' });

		const formData = await request.formData();
		const raw = {
			count: formData.get('count') as string,
			prefix: (formData.get('prefix') as string) || 'T',
			restaurantId: formData.get('restaurantId') as string,
			organizationId: formData.get('organizationId') as string
		};

		// M2: validate all fields including UUIDs
		const result = setupTablesSchema.safeParse(raw);
		if (!result.success) {
			return fail(422, {
				action: 'setupTables',
				error: result.error.issues[0]?.message ?? 'Invalid input'
			});
		}

		if (!appEnv.databaseUrl) {
			// Mock mode: skip DB and just continue
			redirect(303, '/dashboard/onboarding?step=3');
		}

		try {
			await createTablesForRestaurant({
				organizationId: result.data.organizationId,
				restaurantId: result.data.restaurantId,
				count: result.data.count,
				prefix: result.data.prefix
			});
		} catch (err) {
			console.error('[onboarding] createTablesForRestaurant error:', err);
			return fail(500, { action: 'setupTables', error: 'Failed to create tables. Please try again.' });
		}

		redirect(303, '/dashboard/onboarding?step=3');
	},

	/**
	 * Step 3: create the first draft menu.
	 * Redirects to step=4 on success.
	 */
	createDraftMenu: async ({ request, locals }) => {
		// C2: auth guard — layout load() does not cover form actions
		if (!locals.user) return fail(401, { action: 'createDraftMenu', error: 'Unauthorized' });

		const formData = await request.formData();
		// M2: validate UUIDs
		const result = createDraftMenuSchema.safeParse({
			restaurantId: formData.get('restaurantId'),
			organizationId: formData.get('organizationId')
		});
		if (!result.success) {
			return fail(422, {
				action: 'createDraftMenu',
				error: result.error.issues[0]?.message ?? 'Invalid input'
			});
		}

		if (!appEnv.databaseUrl) {
			redirect(303, '/dashboard/onboarding?step=4');
		}

		try {
			await createDraftMenu({
				organizationId: result.data.organizationId,
				restaurantId: result.data.restaurantId
			});
		} catch (err) {
			console.error('[onboarding] createDraftMenu error:', err);
			return fail(500, { action: 'createDraftMenu', error: 'Failed to create menu. Please try again.' });
		}

		redirect(303, '/dashboard/onboarding?step=4');
	}
};
