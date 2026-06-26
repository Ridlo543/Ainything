import { randomBytes } from 'crypto';
import bcryptjs from 'bcryptjs';
const bcryptHash = bcryptjs.hash;
import type { z } from 'zod';
import {
	inviteStaffSchema,
	removeMemberSchema,
	cancelInviteSchema,
	changeRoleSchema,
	createStaffSchema,
	editStaffSchema,
	type CreateStaffInput,
	type EditStaffInput
} from '$lib/domain/staff/schema';
import {
	listMembershipsWithUsers,
	listPendingInvitesWithInviter,
	createInvite,
	deleteMembership,
	deleteInvite,
	updateMembershipRole,
	createUserWithMembership,
	updateUserProfile,
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
	organizationId: string;
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

	await deleteMembership(membershipId, params.organizationId);
}

export async function cancelInvite(params: {
	inviteId: string;
	organizationId: string;
	requesterRole: string;
}): Promise<void> {
	const parsed = parseInput({ inviteId: params.inviteId }, cancelInviteSchema, 'cancel invite');
	const { inviteId } = parsed as { inviteId: string };

	if (params.requesterRole !== 'owner') {
		throw new StaffManagementPermissionError('Only owners can cancel invites');
	}

	await deleteInvite(inviteId, params.organizationId);
}

export async function changeRole(params: {
	membershipId: string;
	organizationId: string;
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

	await updateMembershipRole(membershipId, params.organizationId, role);
}

/**
 * Creates a staff account directly — no invite token required.
 * Atomically inserts app_user + membership in one transaction.
 * Only org owners may create staff accounts.
 */
export async function createStaffAccount(params: {
	input: CreateStaffInput;
	organizationId: string;
	requesterRole: string;
}): Promise<{ userId: string; email: string }> {
	if (params.requesterRole !== 'owner') {
		throw new StaffManagementPermissionError('Only owners can create staff accounts');
	}

	const parsed = parseInput(params.input, createStaffSchema, 'create staff') as CreateStaffInput;
	const passwordHash = await bcryptHash(parsed.password, 12);

	try {
		const user = await createUserWithMembership({
			email: parsed.email,
			name: parsed.name,
			passwordHash,
			organizationId: params.organizationId,
			role: parsed.role
		});
		return { userId: user.id, email: user.email };
	} catch (err) {
		if (err instanceof Error && err.message === 'EMAIL_ALREADY_EXISTS') {
			throw new StaffManagementInputError(`An account with email "${parsed.email}" already exists`);
		}
		throw err;
	}
}

/**
 * Edits a staff member's name and optionally resets their password.
 * Only org owners may edit members.
 */
export async function editStaffMember(params: {
	input: EditStaffInput;
	organizationId: string;
	requesterRole: string;
}): Promise<void> {
	if (params.requesterRole !== 'owner') {
		throw new StaffManagementPermissionError('Only owners can edit staff members');
	}

	const parsed = parseInput(params.input, editStaffSchema, 'edit staff') as EditStaffInput;
	const passwordHash = parsed.password ? await bcryptHash(parsed.password, 12) : undefined;

	await updateUserProfile({
		membershipId: parsed.membershipId,
		organizationId: params.organizationId,
		name: parsed.name,
		passwordHash
	});
}
