import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	listMembershipsWithUsers,
	listPendingInvitesWithInviter
} from '$lib/server/repositories/staff-repository';
import {
	createStaffAccount,
	editStaffMember,
	removeMember,
	cancelInvite,
	changeRole,
	StaffManagementInputError,
	StaffManagementPermissionError
} from '$lib/server/services/staff-management-service';
import { createStaffSchema, editStaffSchema, changeRoleSchema } from '$lib/domain/staff/schema';

type Role = 'owner' | 'manager' | 'staff';
type MemberStatus = 'active' | 'invited';

interface Member {
	id: string;
	name: string;
	email: string;
	role: Role;
	status: MemberStatus;
	since: string;
	avatar: string | null;
}

interface Invite {
	id: string;
	email: string;
	role: Role;
	sentAt: string;
}

function timeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	if (seconds < 60) return `${seconds} dtk lalu`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes} mnt lalu`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} jam lalu`;
	return `${Math.floor(hours / 24)} hari lalu`;
}

function formatMonth(date: Date): string {
	const months = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'Mei',
		'Jun',
		'Jul',
		'Agt',
		'Sep',
		'Okt',
		'Nov',
		'Des'
	];
	return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function mapRole(role: string): Role {
	if (role === 'owner' || role === 'manager' || role === 'staff') return role;
	return 'staff';
}

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	const org = tenant.organization;

	try {
		const [memberships, pendingInvites] = await Promise.all([
			listMembershipsWithUsers(org.id),
			listPendingInvitesWithInviter(org.id)
		]);

		const members: Member[] = memberships.map((m) => ({
			id: m.id,
			name: m.user_name || m.user_email || 'Unknown',
			email: m.user_email || '',
			role: mapRole(m.role),
			status: 'active' as MemberStatus,
			since: formatMonth(new Date(m.created_at)),
			avatar: null
		}));

		const invites: Invite[] = pendingInvites.map((inv) => ({
			id: inv.id,
			email: inv.email,
			role: mapRole(inv.role),
			sentAt: timeAgo(new Date(inv.created_at))
		}));

		return { members, invites };
	} catch (err) {
		console.error('[team] Failed to load team members:', err);
		return { members: [], invites: [] };
	}
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ActionResult =
	| { success: true; message: string }
	| {
			success?: never;
			error: string;
			errors?: Record<string, string[]>;
			values?: Record<string, unknown>;
	  };

function handleServiceError(err: unknown): ReturnType<typeof fail<ActionResult>> {
	if (err instanceof StaffManagementInputError) {
		return fail(400, { error: err.message });
	}
	if (err instanceof StaffManagementPermissionError) {
		return fail(403, { error: err.message });
	}
	console.error('[team action] Unexpected error:', err);
	return fail(500, { error: 'Terjadi kesalahan. Coba lagi.' });
}

async function getTenantContext(user: App.Locals['user']) {
	const { resolveTenantContext } = await import('$lib/server/tenant/tenant-context');
	return resolveTenantContext(user!);
}

// ---------------------------------------------------------------------------
// Form actions
// ---------------------------------------------------------------------------

export const actions: Actions = {
	/**
	 * Create a staff account directly — no invite token required.
	 * Expects form fields: name, email, password, role
	 */
	createStaff: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Tidak terautentikasi.' });

		const data = Object.fromEntries(await request.formData());
		const parsed = createStaffSchema.safeParse(data);
		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, { errors, values: data });
		}

		const tenant = await getTenantContext(user);
		const requesterRole = tenant.membership?.role ?? 'staff';

		try {
			await createStaffAccount({
				input: parsed.data,
				organizationId: tenant.organization.id,
				requesterRole
			});
		} catch (err) {
			return handleServiceError(err);
		}

		return { success: true, message: `Akun untuk ${parsed.data.email} berhasil dibuat.` };
	},

	/**
	 * Edit a staff member's name and optionally reset their password.
	 * Expects form fields: membershipId, name, password (optional)
	 */
	editStaff: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Tidak terautentikasi.' });

		const data = Object.fromEntries(await request.formData());
		const parsed = editStaffSchema.safeParse(data);
		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, { errors, values: data });
		}

		const tenant = await getTenantContext(user);
		const requesterRole = tenant.membership?.role ?? 'staff';

		try {
			await editStaffMember({
				input: parsed.data,
				organizationId: tenant.organization.id,
				requesterRole
			});
		} catch (err) {
			return handleServiceError(err);
		}

		return { success: true, message: 'Data anggota berhasil diperbarui.' };
	},

	/**
	 * Change a member's role.
	 * Expects form fields: membershipId, role
	 */
	changeRole: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Tidak terautentikasi.' });

		const data = Object.fromEntries(await request.formData());
		const parsed = changeRoleSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, { error: 'Input tidak valid.' });
		}

		const tenant = await getTenantContext(user);
		const requesterRole = tenant.membership?.role ?? 'staff';

		try {
			await changeRole({
				membershipId: parsed.data.membershipId,
				organizationId: tenant.organization.id,
				role: parsed.data.role,
				requesterRole
			});
		} catch (err) {
			return handleServiceError(err);
		}

		return { success: true, message: 'Role berhasil diubah.' };
	},

	/**
	 * Remove a member from the organization.
	 * Expects form field: membershipId
	 */
	removeMember: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Tidak terautentikasi.' });

		const data = Object.fromEntries(await request.formData());
		const membershipId = String(data.membershipId ?? '');
		if (!membershipId) return fail(400, { error: 'membershipId diperlukan.' });

		const tenant = await getTenantContext(user);
		const requesterRole = tenant.membership?.role ?? 'staff';

		try {
			await removeMember({
				membershipId,
				organizationId: tenant.organization.id,
				requesterRole
			});
		} catch (err) {
			return handleServiceError(err);
		}

		return { success: true, message: 'Anggota berhasil dihapus.' };
	},

	/**
	 * Cancel a pending invite.
	 * Expects form field: inviteId
	 */
	cancelInvite: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Tidak terautentikasi.' });

		const data = Object.fromEntries(await request.formData());
		const inviteId = String(data.inviteId ?? '');
		if (!inviteId) return fail(400, { error: 'inviteId diperlukan.' });

		const tenant = await getTenantContext(user);
		const requesterRole = tenant.membership?.role ?? 'staff';

		try {
			await cancelInvite({
				inviteId,
				organizationId: tenant.organization.id,
				requesterRole
			});
		} catch (err) {
			return handleServiceError(err);
		}

		return { success: true, message: 'Undangan berhasil dibatalkan.' };
	}
};
