import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import {
	listStaffMembers,
	listPendingInvites,
	inviteStaff,
	removeMember,
	cancelInvite,
	changeRole,
	StaffManagementInputError,
	StaffManagementPermissionError
} from '$lib/server/services/staff-management-service';
import { appEnv } from '$lib/server/config/env';

// ---------------------------------------------------------------------------
// Input schemas (action-layer Zod validation)
// ---------------------------------------------------------------------------
const inviteActionSchema = z.object({
	email: z.string().email('Invalid email address').max(320),
	role: z.enum(['owner', 'manager', 'staff'], { message: 'Invalid role' }),
	organizationName: z.string().max(100).default('')
});

const membershipIdSchema = z.object({
	membershipId: z.string().uuid('Invalid membership ID')
});

const inviteIdSchema = z.object({
	inviteId: z.string().uuid('Invalid invite ID')
});

const changeRoleActionSchema = z.object({
	membershipId: z.string().uuid('Invalid membership ID'),
	role: z.enum(['owner', 'manager', 'staff'], { message: 'Invalid role' })
});

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();

	if (appEnv.databaseUrl && !appEnv.useMockBackend) {
		try {
			const [members, invites] = await Promise.all([
				listStaffMembers(tenant.organization.id),
				listPendingInvites(tenant.organization.id)
			]);
			return { tenant, members, invites };
		} catch (err) {
			if (appEnv.nodeEnv === 'production') {
				throw err;
			}
			console.warn('[staff] Could not load staff data:', err);
			return { tenant, members: [], invites: [] };
		}
	}

	// Mock data fallback for local dev without DB
	return { tenant, members: [], invites: [] };
};

export const actions: Actions = {
	invite: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const organizationId = locals.user.memberships[0]?.organizationId;
		if (!organizationId) return fail(400, { error: 'No organization found' });

		const formData = await request.formData();
		const parsed = inviteActionSchema.safeParse({
			email: formData.get('email'),
			role: formData.get('role'),
			organizationName: formData.get('organizationName') ?? ''
		});
		if (!parsed.success) {
			return fail(422, { error: parsed.error.issues[0]?.message ?? 'Invalid input' });
		}

		try {
			const { inviteId } = await inviteStaff({
				organizationId,
				invitedByUserId: locals.user.id,
				inviterName: locals.user.name ?? 'A team member',
				organizationName: parsed.data.organizationName || organizationId,
				email: parsed.data.email,
				role: parsed.data.role,
				appUrl: appEnv.publicAppUrl
			});
			return { success: true, inviteId };
		} catch (err) {
			if (err instanceof StaffManagementInputError) return fail(400, { error: err.message });
			if (err instanceof StaffManagementPermissionError) return fail(403, { error: err.message });
			console.error('[staff] invite action error:', err);
			return fail(500, { error: 'Failed to create invite' });
		}
	},

	remove: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const parsed = membershipIdSchema.safeParse({ membershipId: formData.get('membershipId') });
		if (!parsed.success) {
			return fail(422, { error: parsed.error.issues[0]?.message ?? 'Invalid input' });
		}

		try {
			const requesterRole = locals.user.memberships[0]?.role ?? 'staff';
			await removeMember({ membershipId: parsed.data.membershipId, requesterRole });
			return { success: true };
		} catch (err) {
			if (err instanceof StaffManagementInputError) return fail(400, { error: err.message });
			if (err instanceof StaffManagementPermissionError) return fail(403, { error: err.message });
			console.error('[staff] remove action error:', err);
			return fail(500, { error: 'Failed to remove member' });
		}
	},

	cancelInvite: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const parsed = inviteIdSchema.safeParse({ inviteId: formData.get('inviteId') });
		if (!parsed.success) {
			return fail(422, { error: parsed.error.issues[0]?.message ?? 'Invalid input' });
		}

		try {
			const requesterRole = locals.user.memberships[0]?.role ?? 'staff';
			await cancelInvite({ inviteId: parsed.data.inviteId, requesterRole });
			return { success: true };
		} catch (err) {
			if (err instanceof StaffManagementInputError) return fail(400, { error: err.message });
			if (err instanceof StaffManagementPermissionError) return fail(403, { error: err.message });
			console.error('[staff] cancelInvite action error:', err);
			return fail(500, { error: 'Failed to cancel invite' });
		}
	},

	changeRole: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const parsed = changeRoleActionSchema.safeParse({
			membershipId: formData.get('membershipId'),
			role: formData.get('role')
		});
		if (!parsed.success) {
			return fail(422, { error: parsed.error.issues[0]?.message ?? 'Invalid input' });
		}

		try {
			const requesterRole = locals.user.memberships[0]?.role ?? 'staff';
			await changeRole({
				membershipId: parsed.data.membershipId,
				role: parsed.data.role,
				requesterRole
			});
			return { success: true };
		} catch (err) {
			if (err instanceof StaffManagementInputError) return fail(400, { error: err.message });
			if (err instanceof StaffManagementPermissionError) return fail(403, { error: err.message });
			console.error('[staff] changeRole action error:', err);
			return fail(500, { error: 'Failed to change role' });
		}
	}
};
