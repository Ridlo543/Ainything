/**
 * Vitest global setup — loads .env into process.env before any test runs.
 *
 * This makes opt-in flags like RUN_DB_TESTS and RUN_LLM_TESTS work by simply
 * uncommenting the relevant line in .env, without needing to export variables
 * manually in the shell before running the test command.
 *
 * Uses only Node.js built-ins (fs + path) — no dotenv dependency needed.
 * Variables already set in the environment are NOT overwritten (shell wins).
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');

if (existsSync(envPath)) {
	const lines = readFileSync(envPath, 'utf-8').split('\n');

	for (const line of lines) {
		const trimmed = line.trim();

		// Skip blank lines and comments.
		if (!trimmed || trimmed.startsWith('#')) continue;

		const eqIdx = trimmed.indexOf('=');
		if (eqIdx === -1) continue;

		const key = trimmed.slice(0, eqIdx).trim();
		const value = trimmed.slice(eqIdx + 1).trim();

		// Shell-set variables take precedence over .env.
		if (!(key in process.env)) {
			process.env[key] = value;
		}
	}
}
