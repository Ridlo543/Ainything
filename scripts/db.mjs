import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Client } from 'pg';

const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, 'db', 'migrations');
const seedsDir = path.join(rootDir, 'db', 'seeds');
const defaultDatabaseUrl = 'postgresql://ainything:ainything@localhost:5432/ainything';

loadEnvFile(path.join(rootDir, '.env'));

const command = process.argv[2];

if (!['migrate', 'seed', 'reset'].includes(command)) {
	console.error('Usage: pnpm db:migrate | pnpm db:seed | pnpm db:reset');
	process.exit(1);
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || defaultDatabaseUrl;

const client = new Client({ connectionString });

try {
	await client.connect();

	if (command === 'migrate') {
		await migrate();
	}

	if (command === 'seed') {
		await seed();
	}

	if (command === 'reset') {
		await reset();
	}
} finally {
	await client.end();
}

async function migrate() {
	await client.query(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		)
	`);

	const migrationFiles = listSqlFiles(migrationsDir);

	for (const file of migrationFiles) {
		const id = path.basename(file, '.sql');
		const alreadyApplied = await client.query('SELECT 1 FROM schema_migrations WHERE id = $1', [
			id
		]);

		if (alreadyApplied.rowCount) {
			console.log(`skip ${id}`);
			continue;
		}

		const sql = readFileSync(file, 'utf8');

		await client.query('BEGIN');
		try {
			await client.query(sql);
			await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id]);
			await client.query('COMMIT');
			console.log(`applied ${id}`);
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		}
	}
}

async function seed() {
	await migrate();
	const seedFiles = listSqlFiles(seedsDir);

	for (const file of seedFiles) {
		const id = path.basename(file, '.sql');
		const sql = readFileSync(file, 'utf8');

		await client.query('BEGIN');
		try {
			await client.query(sql);
			await client.query('COMMIT');
			console.log(`seeded ${id}`);
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		}
	}
}

async function reset() {
	await client.query('DROP SCHEMA public CASCADE');
	await client.query('DROP SCHEMA IF EXISTS app CASCADE');
	await client.query('CREATE SCHEMA public');
	await client.query('GRANT ALL ON SCHEMA public TO CURRENT_USER');
	await client.query('GRANT ALL ON SCHEMA public TO public');
	console.log('dropped and recreated public and app schemas');
	await migrate();
	await seed();
}

function listSqlFiles(directory) {
	if (!existsSync(directory)) {
		return [];
	}

	return readdirSync(directory)
		.filter((file) => file.endsWith('.sql'))
		.sort((left, right) => left.localeCompare(right))
		.map((file) => path.join(directory, file));
}

function loadEnvFile(filePath) {
	if (!existsSync(filePath)) {
		return;
	}

	const raw = readFileSync(filePath, 'utf8');

	for (const line of raw.split(/\r?\n/)) {
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}

		const separatorIndex = trimmed.indexOf('=');

		if (separatorIndex === -1) {
			continue;
		}

		const key = trimmed.slice(0, separatorIndex).trim();
		const value = trimmed
			.slice(separatorIndex + 1)
			.trim()
			.replace(/^['"]|['"]$/g, '');

		if (!process.env[key]) {
			process.env[key] = value;
		}
	}
}
