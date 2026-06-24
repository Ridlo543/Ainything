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
	reporter: isCI ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]] : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
	outputDir: 'tests/e2e/test-results',
	webServer: {
		command: 'pnpm run build && pnpm run preview',
		port: 4173,
		// In local dev: reuse a running preview server to skip rebuild.
		// Start one manually with: pnpm run build && pnpm run preview
		// In CI always do a fresh build.
		reuseExistingServer: !isCI,
		timeout: 180_000,
		stdout: 'pipe',
		stderr: 'pipe',
		env: {
			PUBLIC_APP_URL: 'http://localhost:4173',
			// Use lingua_app (application role with RLS) instead of superuser
			// to validate actual security boundaries in E2E tests
			DATABASE_URL: 'postgresql://lingua_app:lingua_app@127.0.0.1:5432/lingua',
			DIRECT_URL: 'postgresql://lingua:lingua@127.0.0.1:5432/lingua',
			AUTH_PROVIDER: 'mock',
			USE_MOCK_BACKEND: 'true',
			SESSION_SECRET: 'e2e-test-session-secret',
			LLM_PROVIDER: 'mock',
			OCR_PROVIDER: 'mock',
			WHATSAPP_PROVIDER: 'mock',
			STORAGE_PROVIDER: 'mock',
			REDIS_URL: 'redis://127.0.0.1:6379',
			AI_DAILY_CAP: '500',
			EMBEDDING_ENABLED: 'false'
		}
	}
});
