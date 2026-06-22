import { getPool } from '$lib/server/db/postgres';

export type AppUserRow = {
	id: string;
	external_auth_id: string;
	email: string;
	name: string;
	platform_role: string;
};

export async function findAppUserByExternalId(externalAuthId: string): Promise<AppUserRow | null> {
	const pool = getPool();
	const { rows } = await pool.query<AppUserRow>(
		'SELECT id, external_auth_id, email, name, platform_role FROM app_users WHERE external_auth_id = $1 LIMIT 1',
		[externalAuthId]
	);

	return rows[0] ?? null;
}
