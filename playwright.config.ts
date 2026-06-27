import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.spec.ts',
	timeout: 60_000,
	// Run tests in parallel across workers for speed
	fullyParallel: true,
	workers: isCI ? 2 : 4,
	// Retry flaky tests once in CI
	retries: isCI ? 1 : 0,
	reporter: isCI
		? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
		: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
	outputDir: 'tests/e2e/test-results',
	webServer: {
		// In CI: always do a fresh build then start preview.
		// Locally: just start preview (build manually first with `pnpm run build`).
		// This avoids ENOTEMPTY on Windows when build/ is already populated.
		command: isCI ? 'pnpm run build && pnpm run preview' : 'pnpm run preview',
		port: 4173,
		reuseExistingServer: false,
		timeout: 180_000,
		stdout: 'pipe',
		stderr: 'pipe',
		env: {
			NODE_ENV: 'test',
			PUBLIC_APP_URL: 'http://localhost:4173',
			// Use ainything_app (application role with RLS) instead of superuser
			// to validate actual security boundaries in E2E tests
			DATABASE_URL: 'postgresql://ainything_app:ainything_app@127.0.0.1:5432/ainything',
			DIRECT_URL: 'postgresql://ainything:ainything@127.0.0.1:5432/ainything',
			AUTH_PROVIDER: 'local',
			SESSION_SECRET: 'e2e-test-session-secret',
			LLM_PROVIDER: 'mock',
			OCR_PROVIDER: 'mock',
			WHATSAPP_PROVIDER: 'mock',
			STORAGE_PROVIDER: 'mock',
			REDIS_URL: 'redis://127.0.0.1:6379',
			AI_DAILY_CAP: '500',
			EMBEDDING_ENABLED: 'false',
			PUBLIC_SENTRY_DSN: 'stub'
		}
	}
});
