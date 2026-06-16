import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkRedisHealth } from '$lib/server/cache/redis';
import { appEnv } from '$lib/server/config/env';
import { checkPostgresHealth } from '$lib/server/db/postgres';

type DependencyStatus = 'ok' | 'error' | 'not-configured';

export const GET: RequestHandler = async () => {
	const [database, redis] = await Promise.all([
		checkDependency(Boolean(appEnv.databaseUrl), checkPostgresHealth),
		checkDependency(Boolean(appEnv.redisUrl), checkRedisHealth)
	]);

	const backendOk = database === 'ok' && redis === 'ok';

	return json(
		{
			ok: backendOk,
			backend: {
				database,
				redis,
				supabase: appEnv.supabaseUrl && appEnv.supabaseAnonKey ? 'configured' : 'not-configured',
				mockBackend: appEnv.useMockBackend
			}
		},
		{ status: backendOk ? 200 : 503 }
	);
};

async function checkDependency(configured: boolean, check: () => Promise<boolean>) {
	if (!configured) {
		return 'not-configured' satisfies DependencyStatus;
	}

	try {
		return ((await check()) ? 'ok' : 'error') satisfies DependencyStatus;
	} catch (error) {
		console.error('Backend health dependency check failed', error);
		return 'error' satisfies DependencyStatus;
	}
}
