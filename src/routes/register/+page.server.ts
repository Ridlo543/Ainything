import { appEnv } from '$lib/server/config/env';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return { isMock: appEnv.authProvider === 'mock' };
};
