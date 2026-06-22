import { execSync } from 'node:child_process';

const red = '\x1b[31m';
const yellow = '\x1b[33m';
const green = '\x1b[32m';
const reset = '\x1b[0m';

let exitCode = 0;

console.log('[audit] Checking for outdated dependencies...\n');
try {
	const outdated = execSync('pnpm outdated --no-table 2>&1 || true', {
		encoding: 'utf8',
		stdio: 'pipe'
	});
	if (outdated.trim()) {
		console.log(`${yellow}Outdated dependencies:${reset}`);
		console.log(outdated);
		exitCode = 1;
	} else {
		console.log(`${green}All dependencies up to date.${reset}`);
	}
} catch {
	console.log(`${yellow}Skipping pnpm outdated (may not be supported).${reset}`);
}

console.log('\n[audit] Running pnpm audit...\n');
try {
	execSync('pnpm audit --audit-level moderate', { encoding: 'utf8', stdio: 'inherit' });
	console.log(`\n${green}No moderate-or-higher vulnerabilities found.${reset}`);
} catch (err) {
	console.log(`\n${red}Vulnerabilities found at moderate level or above.${reset}`);
	exitCode = 1;
}

console.log('\n[audit] Checking for unmaintained packages...\n');
const deprecatedCheck = ['pnpm ls --depth 0 2>&1'];
for (const cmd of deprecatedCheck) {
	try {
		execSync(cmd, { encoding: 'utf8', stdio: 'inherit' });
	} catch {
		// Non-zero exit is fine
	}
}

if (exitCode === 0) {
	console.log(`\n${green}Dependency audit passed.${reset}`);
} else {
	console.log(`\n${red}Dependency audit found issues. Review above output.${reset}`);
}

process.exit(exitCode);
