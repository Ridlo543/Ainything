import { z } from 'zod';

export const inviteStaffSchema = z.object({
	email: z.string().email('Invalid email address'),
	role: z.enum(['owner', 'manager', 'staff'], {
		message: 'Role must be owner, manager, or staff'
	})
});

export const removeMemberSchema = z.object({
	membershipId: z.string().uuid('Invalid membership ID')
});

export const cancelInviteSchema = z.object({
	inviteId: z.string().uuid('Invalid invite ID')
});

export const changeRoleSchema = z.object({
	membershipId: z.string().uuid('Invalid membership ID'),
	role: z.enum(['owner', 'manager', 'staff'], {
		message: 'Role must be owner, manager, or staff'
	})
});
