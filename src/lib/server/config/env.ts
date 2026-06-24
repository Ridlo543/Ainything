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

	// Auth
	authProvider: env.AUTH_PROVIDER || 'mock',

	// LLM — provider selector and per-provider keys.
	// LLM_PROVIDER values: 'mock' | 'tokenrouter' | 'openai' | 'anthropic'
	llmProvider: env.LLM_PROVIDER || 'mock',
	// Model to use. Defaults differ per provider; overridden by LLM_MODEL.
	llmModel: env.LLM_MODEL,
	// TokenRouter (OpenAI-compatible proxy — supports many models with one key)
	tokenrouterApiKey: env.TOKENROUTER_API_KEY,
	tokenrouterBaseUrl: env.TOKENROUTER_BASE_URL || 'https://api.tokenrouter.com/v1',
	// Direct OpenAI key (used when LLM_PROVIDER=openai)
	openaiApiKey: env.OPENAI_API_KEY,
	// Direct Anthropic key (used when LLM_PROVIDER=anthropic)
	anthropicApiKey: env.ANTHROPIC_API_KEY,

	// Cost cap
	aiDailyCap: env.AI_DAILY_CAP ? Number(env.AI_DAILY_CAP) : 500,

	// Embedding / RAG
	embeddingEnabled: env.EMBEDDING_ENABLED === 'true',
	llmEmbeddingModel: env.LLM_EMBEDDING_MODEL || 'text-embedding-3-small',

	// OCR
	ocrProvider: env.OCR_PROVIDER || 'mock',

	// WhatsApp
	whatsappProvider: env.WHATSAPP_PROVIDER || 'mock',

	// Storage (menu imports, item images, knowledge attachments)
	storageProvider: env.STORAGE_PROVIDER || 'mock',

	// Email (SMTP)
	smtpHost: env.SMTP_HOST,
	smtpPort: env.SMTP_PORT ? Number(env.SMTP_PORT) : undefined,
	smtpUser: env.SMTP_USER,
	smtpPass: env.SMTP_PASS,
	smtpFrom: env.SMTP_FROM,

	// Supabase
	// Supports both `@supabase/ssr` (PUBLIC_*) and `@supabase/server` (SUPABASE_*) env conventions
	supabaseUrl:
		env.SUPABASE_URL ||
		publicEnv.PUBLIC_SUPABASE_URL,
	supabaseAnonKey:
		env.SUPABASE_PUBLISHABLE_KEY ||
		publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
		publicEnv.PUBLIC_SUPABASE_ANON_KEY,
	supabaseServiceRoleKey:
		env.SUPABASE_SECRET_KEY ||
		env.SUPABASE_SERVICE_ROLE_KEY,
	supabaseJwksUrl: env.SUPABASE_JWKS_URL
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
