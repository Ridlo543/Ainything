/**
 * Unit tests for createStaffAccount and editStaffMember.
 *
 * All repository calls are mocked — no live database required.
 * Tests cover: permission checks, bcrypt hashing, repository delegation,
 * EMAIL_ALREADY_EXISTS remapping, Zod validation errors, and optional
 * password reset in editStaffMember.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock repository layer before importing the module under test
// ---------------------------------------------------------------------------
const createUserWithMembershipMock = vi.fn();
const updateUserProfileMock = vi.fn();

vi.mock('$lib/server/repositories/staff-repository', () => ({
	listMembershipsWithUsers: vi.fn(),
	listPendingInvitesWithInviter: vi.fn(),
	createInvite: vi.fn(),
	deleteMembership: vi.fn(),
	deleteInvite: vi.fn(),
	updateMembershipRole: vi.fn(),
	createUserWithMembership: (...args: unknown[]) => createUserWithMembershipMock(...args),
	updateUserProfile: (...args: unknown[]) => updateUserProfileMock(...args)
}));

// Mock bcryptjs hash to avoid slow real hashing in tests.
// The service imports `hash as bcryptHash` from 'bcryptjs' (named export),
// so we must mock the named export directly.
vi.mock('bcryptjs', () => {
	const hashFn = vi.fn();
	const compareFn = vi.fn();
	return {
		default: { hash: hashFn, compare: compareFn },
		hash: hashFn,
		compare: compareFn
	};
});

// Mock email provider — inviteStaff is not under test here
vi.mock('$lib/server/email/email-factory', () => ({
	getEmailProvider: vi.fn().mockResolvedValue({ sendEmail: vi.fn() })
}));
vi.mock('$lib/server/email/invite-email', () => ({
	buildInviteEmail: vi.fn().mockReturnValue({ subject: '', html: '' })
}));

import * as bcryptModule from 'bcryptjs';
const bcryptHashMock = vi.mocked(bcryptModule.hash);

// Dynamic import AFTER all vi.mock() calls are hoisted
const {
	createStaffAccount,
	editStaffMember,
	StaffManagementInputError,
	StaffManagementPermissionError
} = await import('./staff-management-service');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
// Use valid UUIDs — editStaffSchema validates membershipId with z.uuid()
// RFC 4122 v4 UUIDs: third group [1-8] (version), fourth group [89ab] (variant)
const ORG_ID = 'a0000000-0000-4000-8000-000000000001';
const MEMBERSHIP_ID = 'b0000000-0000-4000-8000-000000000001';

const VALID_CREATE_INPUT = {
	name: 'Budi Santoso',
	email: 'budi@bali-table.test',
	password: 'secret1234',
	role: 'staff' as const
};

// EditStaffInput.password is string|undefined (required key via Zod .optional().transform())
const VALID_EDIT_INPUT = {
	membershipId: MEMBERSHIP_ID,
	name: 'Budi Santoso Updated',
	password: undefined
};

const VALID_EDIT_WITH_PASSWORD = {
	membershipId: MEMBERSHIP_ID,
	name: 'Budi Santoso Updated',
	password: 'newpass5678'
};

const NEW_USER_ROW = {
	id: 'user-abc',
	email: 'budi@bali-table.test',
	name: 'Budi Santoso'
};

// callerExternalId is required by createStaffAccount and editStaffMember
// for RLS-scoped repository calls — use a stable test value
const CALLER_ID = 'caller-external-test-id';

// ---------------------------------------------------------------------------
// createStaffAccount
// ---------------------------------------------------------------------------
describe('createStaffAccount', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default: hash returns a fake hash string
		bcryptHashMock.mockResolvedValue('$2b$12$fakehash' as never);
		// Default: repository succeeds
		createUserWithMembershipMock.mockResolvedValue(NEW_USER_ROW);
	});

	it('rejects non-owner requesters', async () => {
		await expect(
			createStaffAccount({
				input: VALID_CREATE_INPUT,
				organizationId: ORG_ID,
				requesterRole: 'staff',
				callerExternalId: CALLER_ID
			})
		).rejects.toThrow(StaffManagementPermissionError);

		await expect(
			createStaffAccount({
				input: VALID_CREATE_INPUT,
				organizationId: ORG_ID,
				requesterRole: 'manager',
				callerExternalId: CALLER_ID
			})
		).rejects.toThrow(StaffManagementPermissionError);
	});

	it('hashes the password with bcrypt 12 rounds before calling repository', async () => {
		await createStaffAccount({
			input: VALID_CREATE_INPUT,
			organizationId: ORG_ID,
			requesterRole: 'owner',
			callerExternalId: CALLER_ID
		});

		expect(bcryptHashMock).toHaveBeenCalledOnce();
		expect(bcryptHashMock).toHaveBeenCalledWith('secret1234', 12);
	});

	it('calls createUserWithMembership with correct params', async () => {
		await createStaffAccount({
			input: VALID_CREATE_INPUT,
			organizationId: ORG_ID,
			requesterRole: 'owner',
			callerExternalId: CALLER_ID
		});

		expect(createUserWithMembershipMock).toHaveBeenCalledOnce();
		expect(createUserWithMembershipMock).toHaveBeenCalledWith({
			email: 'budi@bali-table.test',
			name: 'Budi Santoso',
			passwordHash: '$2b$12$fakehash',
			organizationId: ORG_ID,
			role: 'staff',
			callerExternalId: CALLER_ID
		});
	});

	it('returns userId and email from the repository row', async () => {
		const result = await createStaffAccount({
			input: VALID_CREATE_INPUT,
			organizationId: ORG_ID,
			requesterRole: 'owner',
			callerExternalId: CALLER_ID
		});

		expect(result).toEqual({ userId: 'user-abc', email: 'budi@bali-table.test' });
	});

	it('remaps EMAIL_ALREADY_EXISTS to StaffManagementInputError', async () => {
		createUserWithMembershipMock.mockRejectedValue(new Error('EMAIL_ALREADY_EXISTS'));

		await expect(
			createStaffAccount({
				input: VALID_CREATE_INPUT,
				organizationId: ORG_ID,
				requesterRole: 'owner',
				callerExternalId: CALLER_ID
			})
		).rejects.toThrow(StaffManagementInputError);

		await expect(
			createStaffAccount({
				input: VALID_CREATE_INPUT,
				organizationId: ORG_ID,
				requesterRole: 'owner',
				callerExternalId: CALLER_ID
			})
		).rejects.toThrow(/already exists/i);
	});

	it('re-throws unexpected repository errors unchanged', async () => {
		const dbErr = new Error('connection refused');
		createUserWithMembershipMock.mockRejectedValue(dbErr);

		await expect(
			createStaffAccount({
				input: VALID_CREATE_INPUT,
				organizationId: ORG_ID,
				requesterRole: 'owner',
				callerExternalId: CALLER_ID
			})
		).rejects.toThrow('connection refused');
	});

	it('throws StaffManagementInputError on Zod validation failure', async () => {
		await expect(
			createStaffAccount({
				input: { name: '', email: 'not-an-email', password: '123', role: 'staff' },
				organizationId: ORG_ID,
				requesterRole: 'owner',
				callerExternalId: CALLER_ID
			})
		).rejects.toThrow(StaffManagementInputError);

		// Repository must NOT have been called
		expect(createUserWithMembershipMock).not.toHaveBeenCalled();
	});

	it('accepts all valid roles: staff, manager', async () => {
		for (const role of ['staff', 'manager'] as const) {
			vi.clearAllMocks();
			bcryptHashMock.mockResolvedValue('$2b$12$fakehash' as never);
			createUserWithMembershipMock.mockResolvedValue({ ...NEW_USER_ROW });

			await expect(
				createStaffAccount({
					input: { ...VALID_CREATE_INPUT, role },
					organizationId: ORG_ID,
					requesterRole: 'owner',
					callerExternalId: CALLER_ID
				})
			).resolves.toBeDefined();

			expect(createUserWithMembershipMock).toHaveBeenCalledWith(expect.objectContaining({ role }));
		}
	});
});

// ---------------------------------------------------------------------------
// editStaffMember
// ---------------------------------------------------------------------------
describe('editStaffMember', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		bcryptHashMock.mockResolvedValue('$2b$12$newhash' as never);
		updateUserProfileMock.mockResolvedValue(undefined);
	});

	it('rejects non-owner requesters', async () => {
		await expect(
			editStaffMember({
				input: VALID_EDIT_INPUT,
				organizationId: ORG_ID,
				requesterRole: 'staff',
				callerExternalId: CALLER_ID
			})
		).rejects.toThrow(StaffManagementPermissionError);

		await expect(
			editStaffMember({
				input: VALID_EDIT_INPUT,
				organizationId: ORG_ID,
				requesterRole: 'manager',
				callerExternalId: CALLER_ID
			})
		).rejects.toThrow(StaffManagementPermissionError);
	});

	it('updates name only when no password provided', async () => {
		await editStaffMember({
			input: VALID_EDIT_INPUT,
			organizationId: ORG_ID,
			requesterRole: 'owner',
			callerExternalId: CALLER_ID
		});

		// bcrypt should NOT have been called
		expect(bcryptHashMock).not.toHaveBeenCalled();

		expect(updateUserProfileMock).toHaveBeenCalledOnce();
		expect(updateUserProfileMock).toHaveBeenCalledWith({
			membershipId: MEMBERSHIP_ID,
			organizationId: ORG_ID,
			name: 'Budi Santoso Updated',
			passwordHash: undefined,
			callerExternalId: CALLER_ID
		});
	});

	it('hashes new password with 12 rounds when provided', async () => {
		await editStaffMember({
			input: VALID_EDIT_WITH_PASSWORD,
			organizationId: ORG_ID,
			requesterRole: 'owner',
			callerExternalId: CALLER_ID
		});

		expect(bcryptHashMock).toHaveBeenCalledOnce();
		expect(bcryptHashMock).toHaveBeenCalledWith('newpass5678', 12);
	});

	it('passes hashed password to updateUserProfile when password provided', async () => {
		await editStaffMember({
			input: VALID_EDIT_WITH_PASSWORD,
			organizationId: ORG_ID,
			requesterRole: 'owner',
			callerExternalId: CALLER_ID
		});

		expect(updateUserProfileMock).toHaveBeenCalledWith({
			membershipId: MEMBERSHIP_ID,
			organizationId: ORG_ID,
			name: 'Budi Santoso Updated',
			passwordHash: '$2b$12$newhash',
			callerExternalId: CALLER_ID
		});
	});

	it('throws StaffManagementInputError on Zod validation failure', async () => {
		await expect(
			editStaffMember({
				// membershipId missing
				input: { name: 'x' } as never,
				organizationId: ORG_ID,
				requesterRole: 'owner',
				callerExternalId: CALLER_ID
			})
		).rejects.toThrow(StaffManagementInputError);

		expect(updateUserProfileMock).not.toHaveBeenCalled();
	});

	it('resolves void on success', async () => {
		const result = await editStaffMember({
			input: VALID_EDIT_INPUT,
			organizationId: ORG_ID,
			requesterRole: 'owner',
			callerExternalId: CALLER_ID
		});

		expect(result).toBeUndefined();
	});

	it('propagates repository errors', async () => {
		updateUserProfileMock.mockRejectedValue(new Error('DB write failed'));

		await expect(
			editStaffMember({
				input: VALID_EDIT_INPUT,
				organizationId: ORG_ID,
				requesterRole: 'owner',
				callerExternalId: CALLER_ID
			})
		).rejects.toThrow('DB write failed');
	});
});
