import { building } from '$app/environment';
import pg from 'pg';
import { appEnv } from '$lib/server/config/env';

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

export function getPool() {
	if (building) {
		throw new Error('PostgreSQL pool is not available while building the app');
	}

	if (!appEnv.databaseUrl) {
		throw new Error('DATABASE_URL is not configured');
	}

	pool ??= new Pool({
		connectionString: appEnv.databaseUrl,
		max: 10,
		idleTimeoutMillis: 30_000,
		connectionTimeoutMillis: 5_000
	});

	return pool;
}

export async function query<T extends QueryResultRow>(text: string, params: QueryParams = []) {
	return getPool().query<T>(text, params);
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
