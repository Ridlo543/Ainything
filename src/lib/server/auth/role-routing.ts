import type { AuthUser } from '$lib/domain/auth/types';

const ROLE_REDIRECTS: Record<AuthUser['platformRole'], string> = {
	super_admin: '/platform',
	outlet_admin: '/dashboard',
	staff: '/staff/inbox',
	org_owner: '/dashboard'
};

export function resolveRoleRedirect(user: Pick<AuthUser, 'platformRole'>): string {
	return ROLE_REDIRECTS[user.platformRole];
}
