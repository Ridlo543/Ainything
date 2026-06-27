/**
 * Playwright test fixtures and shared login helpers for E2E tests.
 *
 * Auth: LocalAuthProvider — real bcrypt password check against seeded DB.
 * Credentials come from db/seeds/0001_demo_multi_tenant_data.sql.
 *
 * Owner:  owner@bali-table.test / demo1234  → redirected to /dashboard
 * Staff:  staff@jakarta-hospitality.test / demo1234  → redirected to /staff/inbox
 */

import { test as base, expect, type Page } from '@playwright/test';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Seeded demo credentials (LocalAuthProvider, bcrypt-hashed in the DB seed)
// ---------------------------------------------------------------------------
export const DEMO_OWNER = {
	email: 'owner@bali-table.test',
	password: 'demo1234',
	orgSlug: 'bali-table-group'
} as const;

export const DEMO_STAFF = {
	email: 'staff@jakarta-hospitality.test',
	password: 'demo1234',
	orgSlug: 'jakarta-hospitality-lab'
} as const;

// ---------------------------------------------------------------------------
// Shared login helpers — reusable across all spec files
// ---------------------------------------------------------------------------

/**
 * Login as the seeded org owner.
 * Returns true on success, false if login failed (DB not seeded / server not running).
 */
export async function loginAsOwner(page: Page): Promise<boolean> {
	await page.goto('/login');
	await page.getByLabel('Email').fill(DEMO_OWNER.email);
	await page.locator('#password').fill(DEMO_OWNER.password);
	await page.getByRole('button', { name: /masuk/i }).click();
	try {
		await page.waitForURL(/\/dashboard/, { timeout: 10000 });
		return true;
	} catch {
		return false;
	}
}

/**
 * Login as the seeded staff member.
 * Returns true on success, false if login failed.
 */
export async function loginAsStaff(page: Page): Promise<boolean> {
	await page.goto('/login');
	await page.getByLabel('Email').fill(DEMO_STAFF.email);
	await page.locator('#password').fill(DEMO_STAFF.password);
	await page.getByRole('button', { name: /masuk/i }).click();
	try {
		await page.waitForURL(/\/staff\/inbox|\/dashboard/, { timeout: 10000 });
		return true;
	} catch {
		return false;
	}
}

// ---------------------------------------------------------------------------
// Custom fixture types
// ---------------------------------------------------------------------------
type AinythingFixtures = {
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
 *   // Test runs with clean, re-seeded database state
 * });
 * ```
 */
export const test = base.extend<AinythingFixtures>({
	/**
	 * Fixture that ensures a clean database state for tests that need isolation.
	 *
	 * This is opt-in — tests must explicitly use the cleanDatabase fixture
	 * to trigger a database reset before running.
	 *
	 * WARNING: This is SLOW (~10-15 seconds per test). Use only for tests
	 * that absolutely need database isolation.
	 */
	cleanDatabase: async (_unused: object, use) => {
		console.log('Resetting database for test isolation...');
		try {
			execSync('pnpm db:reset', { stdio: 'inherit', timeout: 30000 });
			console.log('Database reset complete');
		} catch (error) {
			console.error('Database reset failed:', error);
			throw error;
		}
		await use({});
	}
});

export { expect };

// ---------------------------------------------------------------------------
// Test utilities
// ---------------------------------------------------------------------------
export const testUtils = {
	/** Generate a unique test identifier for this test run. */
	generateTestId: () => `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,

	/** Wait for a condition with exponential backoff. */
	waitForCondition: async (
		condition: () => Promise<boolean>,
		options: { timeout?: number; interval?: number } = {}
	) => {
		const { timeout = 5000, interval = 100 } = options;
		const startTime = Date.now();
		while (Date.now() - startTime < timeout) {
			if (await condition()) return true;
			await new Promise((resolve) => setTimeout(resolve, interval));
		}
		throw new Error(`Condition not met within ${timeout}ms`);
	}
};
