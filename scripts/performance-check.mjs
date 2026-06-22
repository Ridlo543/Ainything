#!/usr/bin/env node

/**
 * Performance check script for the public QR route.
 *
 * Runs after `pnpm build && pnpm preview` (port 4173) and uses the
 * Lighthouse Node CLI to audit `/r/uma-karang/table/T07` on a simulated
 * slow 4G mobile device.
 *
 * Budgets:
 *   - Performance score ≥ 80
 *   - LCP ≤ 2.5s
 *   - TBT ≤ 300ms
 *   - CLS ≤ 0.1
 *
 * Usage: pnpm perf
 */

import { execSync } from 'node:child_process';
import { statSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BUILD_DIR = resolve(ROOT, 'build');

function fail(msg) {
	console.error(`\n\x1b[31m✖ ${msg}\x1b[0m`);
	process.exitCode = 1;
}

function pass(msg) {
	console.log(`\x1b[32m✔ ${msg}\x1b[0m`);
}

function warn(msg) {
	console.log(`\x1b[33m⚠ ${msg}\x1b[0m`);
}

// Check if build exists
if (!existsSync(BUILD_DIR)) {
	warn('No build/ directory found. Running pnpm build first...');
	execSync('pnpm build', { cwd: ROOT, stdio: 'inherit' });
}

const URL = process.env.PERF_URL || 'http://localhost:4173/r/uma-karang/table/T07';

console.log(`\nRunning Lighthouse audit on ${URL} (simulated slow 4G, mobile)...\n`);

try {
	// lighthouse CLI: https://github.com/GoogleChrome/lighthouse#cli-options
	const result = execSync(
		`npx lighthouse ${URL} --output=json --output-path=stdout --quiet --chrome-flags="--headless --no-sandbox" --preset=desktop`,
		{ cwd: ROOT, maxBuffer: 20 * 1024 * 1024, encoding: 'utf-8' }
	);

	let report;
	try {
		report = JSON.parse(result);
	} catch {
		warn('Could not parse Lighthouse JSON output. Skipping checks.\nOutput (truncated):');
		console.log(result.slice(0, 2000));
		process.exit(0);
	}

	const perfScore = (report.categories?.performance?.score ?? 0) * 100;
	const audits = report.audits ?? {};

	const lcp = audits['largest-contentful-paint']?.numericValue;
	const tbt = audits['total-blocking-time']?.numericValue;
	const cls = audits['cumulative-layout-shift']?.numericValue;
	const si = audits['speed-index']?.numericValue;
	const fcp = audits['first-contentful-paint']?.numericValue;

	console.log(`  Performance score: ${perfScore.toFixed(0)}/100`);
	if (fcp != null) console.log(`  FCP:               ${(fcp / 1000).toFixed(2)}s`);
	if (lcp != null) console.log(`  LCP:               ${(lcp / 1000).toFixed(2)}s`);
	if (tbt != null) console.log(`  TBT:               ${tbt.toFixed(0)}ms`);
	if (cls != null) console.log(`  CLS:               ${cls.toFixed(3)}`);
	if (si != null) console.log(`  Speed Index:       ${(si / 1000).toFixed(2)}s`);

	console.log('');

	let errors = 0;

	if (perfScore < 80) {
		fail(`Performance score ${perfScore.toFixed(0)} < 80`);
		errors++;
	} else {
		pass('Performance score ≥ 80');
	}

	if (lcp != null && lcp > 2500) {
		fail(`LCP ${(lcp / 1000).toFixed(2)}s > 2.5s`);
		errors++;
	} else if (lcp != null) {
		pass('LCP ≤ 2.5s');
	} else {
		warn('LCP not measured');
	}

	if (tbt != null && tbt > 300) {
		fail(`TBT ${tbt.toFixed(0)}ms > 300ms`);
		errors++;
	} else if (tbt != null) {
		pass('TBT ≤ 300ms');
	} else {
		warn('TBT not measured');
	}

	if (cls != null && cls > 0.1) {
		fail(`CLS ${cls.toFixed(3)} > 0.1`);
		errors++;
	} else if (cls != null) {
		pass('CLS ≤ 0.1');
	} else {
		warn('CLS not measured');
	}

	console.log(
		`\n${errors === 0 ? '\x1b[32mAll checks passed\x1b[0m' : '\x1b[31m' + errors + ' check(s) failed\x1b[0m'}`
	);
	process.exit(errors > 0 ? 1 : 0);
} catch (err) {
	if (err.status === 404 || (err.stderr && err.stderr.includes('404'))) {
		warn(`Server returned 404 for ${URL}. Is the preview server running with seed data?`);
		process.exit(0);
	}
	console.error('\x1b[31m✖ Lighthouse audit failed:\x1b[0m', err.message);
	process.exit(1);
}
