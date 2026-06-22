import { execSync, spawn } from 'node:child_process';
import process from 'node:process';

const PORT = 4173;

async function main() {
	console.log('[a11y] Building and starting preview server...');

	const buildProc = spawn('pnpm', ['build'], { stdio: 'inherit', shell: true });
	await new Promise((resolve, reject) => {
		buildProc.on('close', (code) =>
			code === 0 ? resolve() : reject(new Error(`Build failed with code ${code}`))
		);
	});

	const previewProc = spawn('pnpm', ['preview', '--port', String(PORT)], {
		stdio: 'ignore',
		shell: true
	});

	await new Promise((resolve) => setTimeout(resolve, 3000));

	const routes = ['/', '/login', '/demo', '/r/uma-karang/table/T07'];

	let exitCode = 0;

	for (const route of routes) {
		const url = `http://localhost:${PORT}${route}`;
		console.log(`\n[a11y] Checking: ${url}`);

		try {
			execSync(`npx @axe-core/cli "${url}" --exit --tags wcag2a,wcag2aa,wcag21a,wcag21aa 2>&1`, {
				stdio: 'pipe',
				encoding: 'utf8',
				maxBuffer: 10 * 1024 * 1024
			});
			console.log(`  OK — no violations detected.`);
		} catch (err) {
			const output = err.stderr || err.stdout || err.message;
			console.log('  Issues found:');
			console.log(output.slice(0, 2000));
			exitCode = 1;
		}
	}

	previewProc.kill('SIGTERM');

	if (exitCode !== 0) {
		console.log('\n[a11y] Accessibility issues found. Review output above.');
	} else {
		console.log('\n[a11y] All routes passed accessibility checks.');
	}
	process.exit(exitCode);
}

main().catch((err) => {
	console.error('[a11y] Fatal error:', err.message);
	process.exit(1);
});
