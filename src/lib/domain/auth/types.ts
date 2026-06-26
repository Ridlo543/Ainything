export type PlatformRole = 'super_admin' | 'org_owner' | 'outlet_admin' | 'staff';

export type OrgMembership = {
	organizationId: string;
	outletIds: string[];
	role: Exclude<PlatformRole, 'super_admin'>;
};

export type AuthUser = {
	id: string;
	email: string;
	name: string;
	platformRole: PlatformRole;
	memberships: OrgMembership[];
};
