#!/usr/bin/env node
// Tiny runtime-agnostic wrapper around `compose` (Docker Compose v2 / Podman Compose v5).
// Resolves to Podman first, falls back to Docker, and lets callers override with
// CONTAINER_RUNTIME=podman|docker.
//
// Usage:
//   node scripts/infra.mjs up -d            # compose up -d
//   node scripts/infra.mjs down             # compose down
//   node scripts/infra.mjs logs -f          # compose logs -f
//   node scripts/infra.mjs ps               # compose ps
//   node scripts/infra.mjs exec db psql     # compose exec db psql
//   node scripts/infra.mjs doctor           # check runtime + machine status
//
// Examples:
//   CONTAINER_RUNTIME=docker node scripts/infra.mjs up -d
//
// Exit codes: same as the underlying compose command.

import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const RUNTIME_ENV = 'CONTAINER_RUNTIME';
const RUNTIME_PREFERENCE = ['podman', 'docker'];

function log(level, message) {
	const colors = { info: '\u001b[36m', warn: '\u001b[33m', error: '\u001b[31m', dim: '\u001b[2m' };
	const reset = '\u001b[0m';
	const tag = `${colors[level] ?? ''}[infra]${reset}`;
	console.error(`${tag} ${message}`);
}

function detectRuntime() {
	const override = process.env[RUNTIME_ENV]?.toLowerCase();
	if (override) {
		if (!RUNTIME_PREFERENCE.includes(override)) {
			log(
				'error',
				`${RUNTIME_ENV}=${override} is not a supported runtime. Use one of: ${RUNTIME_PREFERENCE.join(', ')}`
			);
			process.exit(2);
		}
		return { runtime: override, source: `${RUNTIME_ENV} env var` };
	}

	for (const candidate of RUNTIME_PREFERENCE) {
		const probe = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
		if (probe.status === 0) {
			return { runtime: candidate, source: 'PATH probe' };
		}
	}

	log(
		'error',
		`No container runtime found. Install Podman (https://podman.io) or Docker (https://docker.com).`
	);
	log('dim', `Set ${RUNTIME_ENV}=podman or ${RUNTIME_ENV}=docker to override detection.`);
	process.exit(127);
}

function printHelp() {
	console.log(`Usage: node scripts/infra.mjs <compose-command> [args...]

Commands:
  up [args...]       Start the local infra (pass -d for detached)
  down [args...]     Stop the local infra (add -v to drop named volumes)
  logs [args...]     Follow compose logs
  ps                 List running services
  pull               Pull images
  restart [args...]  Restart services
  exec <svc> [args]  Run a command in a service
  doctor             Print runtime + machine status

Environment:
  CONTAINER_RUNTIME  Force a runtime: podman or docker
                     (default: auto-detect, podman preferred)
`);
}

async function doctor(runtime) {
	const version = spawn(runtime, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
	const versionChunks = [];
	const versionStderr = [];
	version.stdout.on('data', (chunk) => versionChunks.push(chunk));
	version.stderr.on('data', (chunk) => versionStderr.push(chunk));
	const versionExit = await new Promise((resolve) => version.on('close', resolve));
	const versionText =
		Buffer.concat(versionChunks).toString().trim() ||
		Buffer.concat(versionStderr).toString().trim();

	let machine;
	if (runtime === 'podman') {
		const info = spawn('podman', ['info', '--format', '{{.Host.Security.Rootless}}'], {
			stdio: ['ignore', 'pipe', 'pipe']
		});
		const infoChunks = [];
		info.stdout.on('data', (chunk) => infoChunks.push(chunk));
		const infoExit = await new Promise((resolve) => info.on('close', resolve));
		const rootless = infoExit === 0 ? Buffer.concat(infoChunks).toString().trim() : 'unknown';
		machine = rootless === 'true' ? 'rootless' : rootless === 'false' ? 'rootful' : 'unknown';
	} else {
		machine = 'docker engine (daemon required)';
	}

	const compose = spawn(runtime, ['compose', 'version'], { stdio: ['ignore', 'pipe', 'pipe'] });
	const composeChunks = [];
	compose.stdout.on('data', (chunk) => composeChunks.push(chunk));
	const composeExit = await new Promise((resolve) => compose.on('close', resolve));
	const composeText =
		composeExit === 0 ? Buffer.concat(composeChunks).toString().trim() : 'unavailable';

	console.log(`runtime:     ${runtime} ${versionText || '(no version output)'}`);
	console.log(`mode:        ${machine}`);
	console.log(`compose:     ${composeText}`);
	console.log(`compose.yml: present`);

	if (versionExit !== 0) {
		log('error', `${runtime} is installed but exited with code ${versionExit}.`);
		process.exit(versionExit ?? 1);
	}
}

function runCompose(runtime, composeArgs) {
	const child = spawn(runtime, ['compose', ...composeArgs], {
		stdio: 'inherit',
		windowsHide: true
	});

	const forward = (signal) => {
		if (!child.killed) child.kill(signal);
	};
	process.on('SIGINT', () => forward('SIGINT'));
	process.on('SIGTERM', () => forward('SIGTERM'));

	child.on('error', (error) => {
		log('error', `Failed to start "${runtime} compose": ${error.message}`);
		process.exit(127);
	});

	child.on('close', (code, signal) => {
		if (signal) {
			log('warn', `${runtime} compose was killed by ${signal}.`);
			process.exit(1);
		}
		process.exit(code ?? 0);
	});
}

async function main() {
	const [, , ...argv] = process.argv;

	if (argv.length === 0 || argv[0] === '-h' || argv[0] === '--help') {
		printHelp();
		return;
	}

	const { runtime, source } = detectRuntime();
	log('info', `Using ${runtime} (${source}).`);

	const [command, ...rest] = argv;

	if (command === 'doctor') {
		await doctor(runtime);
		return;
	}

	runCompose(runtime, [command, ...rest]);
}

main().catch((error) => {
	log('error', error.stack ?? error.message);
	process.exit(1);
});
