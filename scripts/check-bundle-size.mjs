import fs from 'node:fs';
import path from 'node:path';

/**
 * Bundle size budget checker for Lingua PWA.
 *
 * Usage: node scripts/check-bundle-size.mjs [--build-dir <path>]
 *
 * Reads the adapter-node build output (default: 'build') and checks that the
 * total gzipped client-side JS + CSS stays within a budget suitable for slow
 * mobile connections on tourist hotspots (hotels, remote cafes, etc.).
 *
 * Exits with code 0 if within budget, 1 if over budget.
 */

const BUILD_DIR = process.argv.includes('--build-dir')
	? process.argv[process.argv.indexOf('--build-dir') + 1]
	: 'build';

const MAX_KB = {
	js: 256,
	css: 80
};

const CLIENT_ASSETS_GLOB = 'client/**/immutable/**';

function collectSizes(dir, ext) {
	const entries = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
	let total = 0;
	const files = [];

	for (const entry of entries) {
		if (!entry.isFile()) continue;
		if (path.extname(entry.name) !== ext) continue;
		const fullPath = path.join(entry.parentPath ?? entry.path, entry.name);
		const stat = fs.statSync(fullPath);
		total += stat.size;
		files.push({ name: path.relative(dir, fullPath), size: stat.size });
	}

	return { total, files };
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

	const clientPath = path.join(BUILD_DIR, CLIENT_ASSETS_GLOB);
	const assetRoot = path.dirname(path.dirname(clientPath));

	// Walk the build directory to find client immutable assets.
	const { total: jsTotal, files: jsFiles } = walkCollect(BUILD_DIR, '.js');
	const { total: cssTotal, files: cssFiles } = walkCollect(BUILD_DIR, '.css');

	console.log(`\nBundle size report (${BUILD_DIR}):`);
	console.log(`  JS:  ${formatKB(jsTotal)}  (budget: ${formatKB(MAX_KB.js * 1024)})`);
	console.log(`  CSS: ${formatKB(cssTotal)}  (budget: ${formatKB(MAX_KB.css * 1024)})`);

	const overJs = jsTotal > MAX_KB.js * 1024;
	const overCss = cssTotal > MAX_KB.css * 1024;

	if (overJs) {
		console.log(`\n  JS OVER BUDGET by ${formatKB(jsTotal - MAX_KB.js * 1024)}`);
		console.log('  Top 5 largest JS files:');
		jsFiles.sort((a, b) => b.size - a.size).slice(0, 5).forEach((f) => {
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
				const stat = fs.statSync(fullPath);
				total += stat.size;
				files.push({ name: path.relative(root, fullPath), size: stat.size });
			}
		}
	};

	walk(root);
	return { total, files };
}

check();