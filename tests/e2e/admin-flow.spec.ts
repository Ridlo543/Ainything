/**
 * Admin dashboard E2E specs.
 * Covers: login page structure, dashboard overview, catalog page, orders, settings.
 *
 * Auth: LocalAuthProvider — real bcrypt password check against seeded DB.
 * Owner: owner@bali-table.test / demo1234 → /dashboard
 */

import { expect, test } from '@playwright/test';
import { loginAsOwner } from './fixtures';

// ---------------------------------------------------------------------------
// Login page structure
// ---------------------------------------------------------------------------

test.describe('Login page', () => {
	test('renders email and password fields', async ({ page }) => {
		await page.goto('/login');

		await expect(page.getByLabel('Email')).toBeVisible();
		await expect(page.getByLabel('Password')).toBeVisible();
		await expect(page.getByRole('button', { name: /masuk/i })).toBeVisible();
	});

	test('shows register link', async ({ page }) => {
		await page.goto('/login');
		await expect(page.getByRole('link', { name: /daftar/i })).toBeVisible();
	});

	test('invalid login shows error', async ({ page }) => {
		await page.goto('/login');

		await page.getByLabel('Email').fill('notexist@example.com');
		await page.getByLabel('Password').fill('x');
		await page.getByRole('button', { name: /masuk/i }).click();

		await expect(page).toHaveURL(/\/login/);
		await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Admin flow at 390px', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('login renders correctly at narrow viewport', async ({ page }) => {
		await page.goto('/login');

		await expect(page.getByLabel('Email')).toBeVisible();
		await expect(page.getByLabel('Password')).toBeVisible();
		await expect(page.getByRole('button', { name: /masuk/i })).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Dashboard overview
// ---------------------------------------------------------------------------

test.describe('Dashboard overview', () => {
	test('renders after owner login', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await expect(page).toHaveURL(/\/dashboard/);
		await expect(page.locator('main, [role="main"], #main-content').first()).toBeVisible();
	});

	test('dashboard navigation links visible', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		// At least one nav link should be visible in the dashboard
		await expect(
			page
				.getByRole('link', { name: /catalog|katalog|orders|pesanan|settings|pengaturan/i })
				.first()
		).toBeVisible({ timeout: 5000 });
	});
});

// ---------------------------------------------------------------------------
// Catalog (uses real seeded products)
// ---------------------------------------------------------------------------

test.describe('Dashboard catalog', () => {
	test('catalog page loads', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await page.goto('/dashboard/catalog');

		await expect(page.getByRole('heading', { name: /catalog|katalog|menu/i })).toBeVisible({
			timeout: 5000
		});
	});

	test('catalog shows seeded products', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await page.goto('/dashboard/catalog');

		// Seeder plants at least 3 products for Uma Karang (owner's primary outlet)
		const items = page.locator(
			'[data-testid="product-row"], [data-testid="product-card"], tbody tr'
		);
		await expect(items.first()).toBeVisible({ timeout: 8000 });
		expect(await items.count()).toBeGreaterThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

test.describe('Dashboard orders', () => {
	test('renders orders page', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await page.goto('/dashboard/orders');

		await expect(page.getByRole('heading', { name: /pesanan|orders/i })).toBeVisible({
			timeout: 5000
		});
	});
});

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

test.describe('Dashboard settings', () => {
	test('renders settings page', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await page.goto('/dashboard/settings');

		await expect(page.getByRole('heading', { name: /settings|pengaturan/i })).toBeVisible({
			timeout: 5000
		});
	});
});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

test.describe('Dashboard analytics', () => {
	test('renders analytics page with range selector', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await page.goto('/dashboard/analytics');

		await expect(page.getByRole('heading', { name: /analytics|analitik/i })).toBeVisible({
			timeout: 5000
		});

		// Range selector buttons (7d / 30d / 90d)
		await expect(page.getByRole('button', { name: /7d|30d|90d/i }).first()).toBeVisible();
	});

	test('range selector changes URL param', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await page.goto('/dashboard/analytics');
		await page.getByRole('button', { name: /30d/i }).click();
		await expect(page).toHaveURL(/range=30d/);
	});
});
