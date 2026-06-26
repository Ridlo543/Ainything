import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import pg from 'pg';

const { Pool } = pg;
type QueryResultRow = pg.QueryResultRow;

type QueryValue = string | number | boolean | Date | null | string[] | Record<string, unknown>;
type QueryParams = QueryValue[];

/**
 * Minimal query surface shared by the pool-level `query` helper and a checked-out
 * `pg.PoolClient`. Repositories depend on this instead of the full `pg` types so the
 * bare `query` helper and a transaction client are interchangeable.
 */
export type DatabaseClient = {
	query<T extends QueryResultRow>(text: string, params?: QueryParams): Promise<pg.QueryResult<T>>;
};

let pool: pg.Pool | null = null;

/**
 * Superuser pool using DIRECT_URL (bypasses RLS and connection poolers).
 * Used for: session resolution, auth operations, migrations, seeds.
 * NOT for regular app queries — use `query` for those.
 */
let directPool: pg.Pool | null = null;

export function getPool() {
	if (building) {
		throw new Error('PostgreSQL pool is not available while building the app');
	}

	// Read env lazily — $env/dynamic/private is populated after module init in the
	// built adapter-node output (set_private_env is called by SvelteKit at request time,
	// not at module evaluation time). Using appEnv (a frozen object literal) would capture
	// undefined values for DATABASE_URL and DIRECT_URL.
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not configured');
	}

	pool ??= new Pool({
		connectionString: databaseUrl,
		max: 10,
		idleTimeoutMillis: 30_000,
		connectionTimeoutMillis: 5_000
	});

	return pool;
}

/**
 * Superuser pool using DIRECT_URL (falls back to DATABASE_URL in local dev).
 * Used by auth operations that run before user context is established.
 */
export function getDirectPool() {
	if (building) {
		throw new Error('PostgreSQL pool is not available while building the app');
	}

	// Read env lazily for the same reason as getPool() above.
	const url = env.DIRECT_URL || env.DATABASE_URL;
	if (!url) {
		throw new Error('DIRECT_URL (or DATABASE_URL) is not configured');
	}

	directPool ??= new Pool({
		connectionString: url,
		max: 5,
		idleTimeoutMillis: 30_000,
		connectionTimeoutMillis: 5_000
	});

	return directPool;
}

export async function query<T extends QueryResultRow>(text: string, params: QueryParams = []) {
	return getPool().query<T>(text, params);
}

/**
 * Superuser query — bypasses RLS. Use only for auth/session operations where
 * user context is not yet available.
 */
export async function directQuery<T extends QueryResultRow>(
	text: string,
	params: QueryParams = []
) {
	return getDirectPool().query<T>(text, params);
}

export async function checkPostgresHealth() {
	const result = await query<{ ok: number }>('SELECT 1 AS ok');
	return result.rows[0]?.ok === 1;
}

export async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>) {
	const client = await getPool().connect();

	try {
		await client.query('BEGIN');
		const result = await callback(client);
		await client.query('COMMIT');
		return result;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

export async function withUserContext<T>(
	userExternalId: string,
	callback: (client: pg.PoolClient) => Promise<T>
) {
	return withTransaction(async (client) => {
		await client.query(`SELECT set_config('app.user_external_id', $1, true)`, [userExternalId]);
		return callback(client);
	});
}

export async function withPublicSessionContext<T>(
	sessionId: string,
	callback: (client: pg.PoolClient) => Promise<T>
) {
	return withTransaction(async (client) => {
		await client.query(`SELECT set_config('app.public_session_id', $1, true)`, [sessionId]);
		return callback(client);
	});
}

/**
 * Superuser transaction — bypasses RLS entirely.
 * Use for public-facing writes (e.g. cart order submission) where RLS policies
 * on ainything_app cannot be satisfied without a pre-existing buyer session.
 * Security is enforced at the application layer (input validation, outlet existence
 * check, server-authoritative pricing) before this function is called.
 */
export async function withDirectTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>) {
	const client = await getDirectPool().connect();

	try {
		await client.query('BEGIN');
		const result = await callback(client);
		await client.query('COMMIT');
		return result;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
