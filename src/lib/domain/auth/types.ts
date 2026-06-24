export type PlatformRole = 'super_admin' | 'org_owner' | 'restaurant_admin' | 'staff';

export type OrgMembership = {
	organizationId: string;
	restaurantIds: string[];
	role: Exclude<PlatformRole, 'super_admin'>;
};

export type AuthUser = {
	id: string;
	email: string;
	name: string;
	platformRole: PlatformRole;
	memberships: OrgMembership[];
};
