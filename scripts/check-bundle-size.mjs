import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

/**
 * Bundle size budget checker for Lingua PWA.
 *
 * Usage: node scripts/check-bundle-size.mjs [--build-dir <path>]
 *
 * Reads the adapter-node build output (default: 'build/client') and checks that
 * the total gzipped client-side JS + CSS stays within budgets suitable for slow
 * mobile connections in tourist hotspots (hotels, remote cafes, etc.).
 *
 * Measures actual gzipped sizes (using Node's zlib with default compression)
 * to simulate real-world network transfer costs.
 *
 * Exits with code 0 if within budget, 1 if over budget.
 */

const BUILD_DIR = process.argv.includes('--build-dir')
	? process.argv[process.argv.indexOf('--build-dir') + 1]
	: 'build';

const MAX_KB = {
	js: 100, // gzipped budget for initial client JS bundle
	css: 30 // gzipped budget for critical CSS
};

/**
 * Returns the gzipped size of a file in bytes.
 */
function getGzippedSize(filePath) {
	const content = fs.readFileSync(filePath);
	const compressed = gzipSync(content);
	return compressed.length;
}

function formatKB(bytes) {
	return `${(bytes / 1024).toFixed(1)} KB`;
}

function check() {
	if (!fs.existsSync(BUILD_DIR)) {
		console.log(`[bundle-check] Build directory '${BUILD_DIR}' not found — skipping.`);
		console.log('[bundle-check] Run `pnpm build` first to generate bundle output.');
		process.exit(0);
	}

	const clientDir = path.join(BUILD_DIR, 'client');

	if (!fs.existsSync(clientDir)) {
		console.log(`[bundle-check] Client directory '${clientDir}' not found.`);
		console.log('[bundle-check] Verify adapter-node is configured correctly.');
		process.exit(1);
	}

	// Measure gzipped sizes of client-side assets only
	const { total: jsTotal, files: jsFiles } = walkCollect(clientDir, '.js');
	const { total: cssTotal } = walkCollect(clientDir, '.css');

	console.log(`\nBundle size report (${clientDir}, gzipped):`);
	console.log(`  JS:  ${formatKB(jsTotal)}  (budget: ${formatKB(MAX_KB.js * 1024)})`);
	console.log(`  CSS: ${formatKB(cssTotal)}  (budget: ${formatKB(MAX_KB.css * 1024)})`);

	const overJs = jsTotal > MAX_KB.js * 1024;
	const overCss = cssTotal > MAX_KB.css * 1024;

	if (overJs) {
		console.log(`\n  JS OVER BUDGET by ${formatKB(jsTotal - MAX_KB.js * 1024)}`);
		console.log('  Top 5 largest JS files:');
		jsFiles
			.sort((a, b) => b.size - a.size)
			.slice(0, 5)
			.forEach((f) => {
				console.log(`    ${f.name} — ${formatKB(f.size)}`);
			});
	}

	if (overCss) {
		console.log(`\n  CSS OVER BUDGET by ${formatKB(cssTotal - MAX_KB.css * 1024)}`);
	}

	if (overJs || overCss) {
		console.log('\n  Bundle size budget exceeded. Consider code-splitting or lazy loading.\n');
		process.exit(1);
	}

	console.log('  Bundle size within budget.\n');
}

function walkCollect(root, ext) {
	let total = 0;
	const files = [];

	const walk = (dir) => {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(fullPath);
			} else if (entry.isFile() && path.extname(entry.name) === ext) {
				const gzippedSize = getGzippedSize(fullPath);
				total += gzippedSize;
				files.push({ name: path.relative(root, fullPath), size: gzippedSize });
			}
		}
	};

	walk(root);
	return { total, files };
}

check();
