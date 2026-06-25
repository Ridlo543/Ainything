import type { PageServerLoad } from './$types';
import { appEnv } from '$lib/server/config/env';
import { listMembershipsWithUsers, listPendingInvitesWithInviter } from '$lib/server/repositories/staff-repository';

type Role = 'owner' | 'manager' | 'staff';
type MemberStatus = 'active' | 'invited';

interface Member {
	id: string;
	name: string;
	email: string;
	role: Role;
	status: MemberStatus;
	since: string;
	avatar: string;
}

interface Invite {
	id: string;
	email: string;
	role: Role;
	sentAt: string;
}

function getMockMembers(): Member[] {
	return [
		{ id: '1', name: 'Made Restaurant Owner', email: 'owner@bali-table.test', role: 'owner', status: 'active', since: 'Juni 2025', avatar: '/mock-images/photo-1507003211169-0a1dd7228f2d.jpg' },
		{ id: '2', name: 'Wayan Kasir', email: 'kasir@bali-table.test', role: 'staff', status: 'active', since: 'Agt 2025', avatar: '/mock-images/photo-1500648767791-00dcc994a43e.jpg' },
		{ id: '3', name: 'Nyoman Manager', email: 'manager@bali-table.test', role: 'manager', status: 'active', since: 'Sep 2025', avatar: '/mock-images/photo-1494790108377-be9c29b29330.jpg' },
	];
}

function getMockInvites(): Invite[] {
	return [
		{ id: 'i1', email: 'newstaff@email.com', role: 'staff', sentAt: '2 hari lalu' },
	];
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
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
	return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function mapRole(role: string): Role {
	if (role === 'owner' || role === 'manager' || role === 'staff') return role;
	return 'staff';
}

const defaultAvatar = '/mock-images/photo-1507003211169-0a1dd7228f2d.jpg';

export const load: PageServerLoad = async ({ parent }) => {
	const { tenant } = await parent();
	const org = tenant.organization;

	if (!appEnv.databaseUrl || appEnv.useMockBackend) {
		return { members: getMockMembers(), invites: getMockInvites() };
	}

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
			avatar: defaultAvatar
		}));

		const invites: Invite[] = pendingInvites.map((inv) => ({
			id: inv.id,
			email: inv.email,
			role: mapRole(inv.role),
			sentAt: timeAgo(new Date(inv.created_at))
		}));

		return { members, invites };
	} catch {
		return { members: getMockMembers(), invites: getMockInvites() };
	}
};
