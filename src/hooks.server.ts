import type { Handle } from '@sveltejs/kit';
import { getSessionUser, sessionCookieName } from '$lib/server/auth/mock-session';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = getSessionUser(event.cookies.get(sessionCookieName));

	return resolve(event);
};
