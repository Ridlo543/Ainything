import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';
import {
	listRequests,
	transitionStatus,
	StaffInboxAuthorizationError,
	StaffInboxTransitionError
} from '$lib/server/services/staff-inbox-service';
import { resolveTenantContext } from '$lib/server/tenant/tenant-context';

const inboxActionSchema = z.object({
	requestId: z.string().uuid(),
	restaurantId: z.string().uuid()
});

/**
 * Load all fallback requests visible to the authenticated staff member.
 *
 * Tenant context (user, org, restaurant IDs) comes from the parent layout's
 * `resolveTenantContext` call — the route is thin and never reads membership
 * data directly.
 */
export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();

	const requests = await listRequests(
		tenant.user.id,
		tenant.organization.id,
		tenant.membership.restaurantIds
	);

	return { requests };
};

export const actions: Actions = {
	/**
	 * Claim a request — transition status from 'new' to 'in_progress'.
	 *
	 * Form must include:
	 *   requestId  — UUID of the fallback_request
	 *   restaurantId — UUID of the owning restaurant (for scope guard)
	 */
	claim: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { message: 'Authentication required.' });
		}

		const tenant = await resolveTenantContext(locals.user);
		const formData = await request.formData();
		const parseResult = inboxActionSchema.safeParse({
			requestId: formData.get('requestId'),
			restaurantId: formData.get('restaurantId')
		});

		if (!parseResult.success) {
			return fail(422, { message: parseResult.error.issues[0]?.message ?? 'Invalid input.' });
		}

		const { requestId, restaurantId } = parseResult.data;

		try {
			await transitionStatus(
				locals.user.id,
				requestId,
				restaurantId,
				'in-progress',
				tenant.membership.restaurantIds
			);
		} catch (err) {
			if (err instanceof StaffInboxAuthorizationError) {
				return fail(403, { message: err.message });
			}
			if (err instanceof StaffInboxTransitionError) {
				return fail(409, { message: err.message });
			}
			console.error('[staff inbox] claim action failed:', err);
			return fail(500, { message: 'An unexpected error occurred.' });
		}

		return { success: true, action: 'claim' as const };
	},

	/**
	 * Resolve a request — transition status from 'in_progress' to 'resolved'.
	 *
	 * Form must include:
	 *   requestId  — UUID of the fallback_request
	 *   restaurantId — UUID of the owning restaurant (for scope guard)
	 */
	resolve: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { message: 'Authentication required.' });
		}

		const tenant = await resolveTenantContext(locals.user);
		const formData = await request.formData();
		const parseResult = inboxActionSchema.safeParse({
			requestId: formData.get('requestId'),
			restaurantId: formData.get('restaurantId')
		});

		if (!parseResult.success) {
			return fail(422, { message: parseResult.error.issues[0]?.message ?? 'Invalid input.' });
		}

		const { requestId, restaurantId } = parseResult.data;

		try {
			await transitionStatus(
				locals.user.id,
				requestId,
				restaurantId,
				'resolved',
				tenant.membership.restaurantIds
			);
		} catch (err) {
			if (err instanceof StaffInboxAuthorizationError) {
				return fail(403, { message: err.message });
			}
			if (err instanceof StaffInboxTransitionError) {
				return fail(409, { message: err.message });
			}
			console.error('[staff inbox] resolve action failed:', err);
			return fail(500, { message: 'An unexpected error occurred.' });
		}

		return { success: true, action: 'resolve' as const };
	}
};
