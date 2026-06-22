/**
 * Vitest global setup — loads environment files before any test runs.
 *
 * Load order (later values do NOT overwrite earlier ones):
 *   1. .env.test  — committed safe defaults for local DB testing
 *   2. .env       — developer overrides (gitignored)
 *   3. Shell env  — always wins
 *
 * This uses globalSetup (not setupFiles) so env vars are available BEFORE
 * test modules are evaluated. This is critical for conditional describe.skip
 * in DB test files.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(filename: string) {
	const envPath = resolve(process.cwd(), filename);
	if (!existsSync(envPath)) return;

	const lines = readFileSync(envPath, 'utf-8').split('\n');

	for (const line of lines) {
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith('#')) continue;

		const eqIdx = trimmed.indexOf('=');
		if (eqIdx === -1) continue;

		const key = trimmed.slice(0, eqIdx).trim();
		const value = trimmed.slice(eqIdx + 1).trim();

		if (!(key in process.env)) {
			process.env[key] = value;
		}
	}
}

export function setup() {
	loadEnvFile('.env.test');
	loadEnvFile('.env');
}
