import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

function requireEnv(value: string | undefined, key: string) {
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}

	return value;
}

export const appEnv = {
	publicAppUrl: publicEnv.PUBLIC_APP_URL || 'http://localhost:5173',
	nodeEnv: env.NODE_ENV || 'development',
	useMockBackend: env.USE_MOCK_BACKEND === 'true',
	sessionSecret: env.SESSION_SECRET || 'demo-session-secret-change-me',
	databaseUrl: env.DATABASE_URL,
	directUrl: env.DIRECT_URL,
	redisUrl: env.REDIS_URL,
	llmProvider: env.LLM_PROVIDER || 'mock',
	aiDailyCap: env.AI_DAILY_CAP ? Number(env.AI_DAILY_CAP) : 500,
	authProvider: env.AUTH_PROVIDER || 'mock',
	supabaseUrl: publicEnv.PUBLIC_SUPABASE_URL,
	supabaseAnonKey: publicEnv.PUBLIC_SUPABASE_ANON_KEY,
	supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
};

export function requireDatabaseEnv() {
	return {
		databaseUrl: requireEnv(appEnv.databaseUrl, 'DATABASE_URL'),
		directUrl: requireEnv(appEnv.directUrl, 'DIRECT_URL')
	};
}

export function requireRedisEnv() {
	return {
		redisUrl: requireEnv(appEnv.redisUrl, 'REDIS_URL')
	};
}
