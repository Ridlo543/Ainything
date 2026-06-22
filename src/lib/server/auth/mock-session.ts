import { demoUsers } from '$lib/mock/restaurants';
import type { AuthUser } from '$lib/domain/auth/types';

export const sessionCookieName = 'lingua_session';

type SessionRecord = {
	id: string;
	userId: string;
	label: string;
};

const demoSessions: SessionRecord[] = [
	{
		id: 'demo-owner-bali-session',
		userId: 'user-owner-bali',
		label: 'Owner demo - Bali Table Group'
	},
	{
		id: 'demo-staff-jakarta-session',
		userId: 'user-staff-jakarta',
		label: 'Staff demo - Jakarta Hospitality Lab'
	}
];

export function getDemoSessions() {
	return demoSessions;
}

export function getDefaultSessionId() {
	return demoSessions[0].id;
}

export function getSessionUser(sessionId: string | undefined): AuthUser | null {
	if (!sessionId) return null;

	const session = demoSessions.find((item) => item.id === sessionId);
	if (!session) return null;

	return demoUsers.find((u) => u.id === session.userId) ?? null;
}

export function getDemoAuthUsers(): AuthUser[] {
	return demoUsers;
}

export function mapDemoUserToAuthUser(userId: string): AuthUser | null {
	return demoUsers.find((u) => u.id === userId) ?? null;
}
