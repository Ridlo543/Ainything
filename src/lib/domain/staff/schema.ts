import { z } from 'zod';

export const STAFF_ROLES = ['owner', 'manager', 'staff'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const inviteStaffSchema = z.object({
	email: z.string().email('Invalid email address'),
	role: z.enum(STAFF_ROLES, {
		message: 'Role must be owner, manager, or staff'
	})
});

/** Direct account creation — skips invite token flow. */
export const createStaffSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
	email: z.string().email('Invalid email address').toLowerCase(),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.max(72, 'Password too long'),
	role: z.enum(STAFF_ROLES, {
		message: 'Role must be owner, manager, or staff'
	})
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

/** Edit staff: change name and/or reset password. */
export const editStaffSchema = z.object({
	membershipId: z.string().uuid('Invalid membership ID'),
	name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
	password: z
		.string()
		.max(72, 'Password too long')
		.optional()
		.transform((v) => (v === '' ? undefined : v))
});

export type EditStaffInput = z.infer<typeof editStaffSchema>;

export const removeMemberSchema = z.object({
	membershipId: z.string().uuid('Invalid membership ID')
});

export const cancelInviteSchema = z.object({
	inviteId: z.string().uuid('Invalid invite ID')
});

export const changeRoleSchema = z.object({
	membershipId: z.string().uuid('Invalid membership ID'),
	role: z.enum(STAFF_ROLES, {
		message: 'Role must be owner, manager, or staff'
	})
});
