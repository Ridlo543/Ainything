/**
 * Playwright test fixtures for E2E tests with database isolation support.
 *
 * Provides utilities for managing database state between tests to prevent
 * test isolation issues (RLS violations, state pollution, flaky failures).
 */

import { test as base, expect } from '@playwright/test';
import { execSync } from 'child_process';

/**
 * Custom fixture types for Lingua E2E tests.
 */
type LinguaFixtures = {
	/** Resets the local database before the test. Opt-in and slow (~10-15s). */
	cleanDatabase: Record<string, never>;
};

/**
 * Extended test fixture with database management capabilities.
 *
 * Usage:
 * ```typescript
 * import { test, expect } from './fixtures';
 *
 * test('my test', async ({ page, cleanDatabase }) => {
 *   // Test runs with clean database state
 * });
 * ```
 */
export const test = base.extend<LinguaFixtures>({
	/**
	 * Fixture that ensures a clean database state for tests that need isolation.
	 *
	 * This is opt-in - tests must explicitly use the cleanDatabase fixture
	 * to trigger a database reset before running.
	 *
	 * WARNING: This is SLOW (~10-15 seconds per test). Use only for tests
	 * that absolutely need database isolation.
	 */
	cleanDatabase: async (_unused: object, use) => {
		// Reset database before test
		console.log('🔄 Resetting database for test isolation...');
		try {
			execSync('pnpm db:reset', {
				stdio: 'inherit',
				timeout: 30000
			});
			console.log('✅ Database reset complete');
		} catch (error) {
			console.error('❌ Database reset failed:', error);
			throw error;
		}

		// Provide empty object (fixture is just a trigger)
		await use({});

		// No cleanup needed (next reset will clear everything)
	}
});

export { expect };

/**
 * Test utilities for managing sessions and test data.
 */
export const testUtils = {
	/**
	 * Generate a unique test identifier for this test run.
	 * Use this to create unique session IDs, user IDs, etc.
	 */
	generateTestId: () => {
		return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
	},

	/**
	 * Wait for a condition with exponential backoff.
	 */
	waitForCondition: async (
		condition: () => Promise<boolean>,
		options: { timeout?: number; interval?: number } = {}
	) => {
		const { timeout = 5000, interval = 100 } = options;
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			if (await condition()) {
				return true;
			}
			await new Promise((resolve) => setTimeout(resolve, interval));
		}

		throw new Error(`Condition not met within ${timeout}ms`);
	}
};
