import { randomBytes } from 'crypto';
import type { z } from 'zod';
import {
	inviteStaffSchema,
	removeMemberSchema,
	cancelInviteSchema,
	changeRoleSchema
} from '$lib/domain/staff/schema';
import {
	listMembershipsWithUsers,
	listPendingInvitesWithInviter,
	createInvite,
	deleteMembership,
	deleteInvite,
	updateMembershipRole,
	type MembershipWithUserRow,
	type InviteWithInviterRow
} from '$lib/server/repositories/staff-repository';
import { getEmailProvider } from '$lib/server/email/email-factory';
import { buildInviteEmail } from '$lib/server/email/invite-email';

export type StaffMember = {
	id: string;
	userId: string;
	email: string;
	name: string;
	role: string;
	createdAt: string;
};

export type PendingInvite = {
	id: string;
	email: string;
	role: string;
	inviterName: string;
	expiresAt: string;
	createdAt: string;
};

export class StaffManagementInputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'StaffManagementInputError';
	}
}

export class StaffManagementPermissionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'StaffManagementPermissionError';
	}
}

function parseInput(input: unknown, schema: z.ZodTypeAny, label: string): unknown {
	const result = schema.safeParse(input);
	if (!result.success) {
		const issues = result.error.issues
			.map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`)
			.join(', ');
		throw new StaffManagementInputError(`Invalid ${label}: ${issues}`);
	}
	return result.data;
}

export async function listStaffMembers(organizationId: string): Promise<StaffMember[]> {
	const rows = await listMembershipsWithUsers(organizationId);
	return rows.map((r: MembershipWithUserRow) => ({
		id: r.id,
		userId: r.user_id,
		email: r.user_email,
		name: r.user_name,
		role: r.role,
		createdAt: r.created_at
	}));
}

export async function listPendingInvites(organizationId: string): Promise<PendingInvite[]> {
	const rows = await listPendingInvitesWithInviter(organizationId);
	return rows.map((r: InviteWithInviterRow) => ({
		id: r.id,
		email: r.email,
		role: r.role,
		inviterName: r.inviter_name,
		expiresAt: r.expires_at,
		createdAt: r.created_at
	}));
}

export async function inviteStaff(params: {
	organizationId: string;
	invitedByUserId: string;
	inviterName: string;
	organizationName: string;
	email: string;
	role: string;
	appUrl: string;
}): Promise<{ inviteId: string; token: string }> {
	const parsed = parseInput(
		{ email: params.email, role: params.role },
		inviteStaffSchema,
		'invite'
	);
	const { email, role } = parsed as { email: string; role: string };

	const token = randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

	const invite = await createInvite({
		organizationId: params.organizationId,
		email,
		role,
		invitedByUserId: params.invitedByUserId,
		token,
		expiresAt
	});

	// Send invite email (non-blocking: log error but don't fail the invite creation)
	try {
		const acceptUrl = `${params.appUrl}/auth/accept-invite?token=${token}`;
		const emailBody = buildInviteEmail({
			organizationName: params.organizationName,
			inviterName: params.inviterName,
			role,
			acceptUrl,
			expiresAt
		});
		await getEmailProvider().send({ to: email, ...emailBody });
	} catch (err) {
		console.error('[inviteStaff] Failed to send invite email:', err);
	}

	return { inviteId: invite.id, token };
}

export async function removeMember(params: {
	membershipId: string;
	requesterRole: string;
}): Promise<void> {
	const parsed = parseInput(
		{ membershipId: params.membershipId },
		removeMemberSchema,
		'remove member'
	);
	const { membershipId } = parsed as { membershipId: string };

	if (params.requesterRole !== 'owner') {
		throw new StaffManagementPermissionError('Only owners can remove members');
	}

	await deleteMembership(membershipId);
}

export async function cancelInvite(params: {
	inviteId: string;
	requesterRole: string;
}): Promise<void> {
	const parsed = parseInput({ inviteId: params.inviteId }, cancelInviteSchema, 'cancel invite');
	const { inviteId } = parsed as { inviteId: string };

	if (params.requesterRole !== 'owner') {
		throw new StaffManagementPermissionError('Only owners can cancel invites');
	}

	await deleteInvite(inviteId);
}

export async function changeRole(params: {
	membershipId: string;
	role: string;
	requesterRole: string;
}): Promise<void> {
	const parsed = parseInput(
		{ membershipId: params.membershipId, role: params.role },
		changeRoleSchema,
		'change role'
	);
	const { membershipId, role } = parsed as { membershipId: string; role: string };

	if (params.requesterRole !== 'owner') {
		throw new StaffManagementPermissionError('Only owners can change roles');
	}

	await updateMembershipRole(membershipId, role);
}
