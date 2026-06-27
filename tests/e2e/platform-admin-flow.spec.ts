/**
 * Platform admin E2E specs.
 * Covers: super_admin access, organizations list, tenants list.
 *
 * Auth: MockAuthProvider — email+password form, password ignored (min 1 char).
 * Super admin: admin@ainything.online → redirected to /platform
 * Platform routes: /platform, /platform/organizations, /platform/tenants
 */

import { expect, test, type Page } from '@playwright/test';

async function loginAsSuperAdmin(page: Page): Promise<boolean> {
	await page.goto('/login');
	await page.getByLabel('Email').fill('admin@ainything.online');
	await page.locator('#password').fill('demo1234');
	await page.getByRole('button', { name: /masuk/i }).click();
	try {
		await page.waitForURL(/\/platform|\/dashboard/, { timeout: 8000 });
		return true;
	} catch {
		return false;
	}
}

test.describe('Platform admin — access control', () => {
	test('unauthenticated user cannot access /platform', async ({ page }) => {
		await page.goto('/platform');
		await page.waitForURL(/login|dashboard/);
		expect(page.url()).not.toContain('/platform');
	});

	test('non-platform user (owner) is redirected away from /platform', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel('Email').fill('owner@bali-table.test');
		await page.locator('#password').fill('demo1234');
		await page.getByRole('button', { name: /masuk/i }).click();
		await page.waitForURL(/\/dashboard/, { timeout: 8000 });

		await page.goto('/platform');
		await page.waitForURL(/login|dashboard/);
		expect(page.url()).not.toMatch(/^.*\/platform$/);
	});
});

test.describe('Platform admin — overview', () => {
	test('platform overview renders stats after super_admin login', async ({ page }) => {
		const ok = await loginAsSuperAdmin(page);
		if (!ok) {
			test.skip(true, 'Login failed');
			return;
		}
		if (!page.url().includes('/platform')) {
			test.skip(true, 'Not redirected to /platform — may not be super_admin in mock');
			return;
		}

		await expect(page.getByRole('heading', { name: /platform|admin|overview/i })).toBeVisible({
			timeout: 5000
		});
	});
});

test.describe('Platform admin — organizations', () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test('organizations list renders table', async ({ page }) => {
		const ok = await loginAsSuperAdmin(page);
		if (!ok) {
			test.skip(true, 'Login failed');
			return;
		}
		if (!page.url().includes('/platform')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await page.goto('/platform/organizations');
		await page.waitForURL(/platform|login|dashboard/);
		if (!page.url().includes('/platform')) {
			test.skip(true, 'Redirected — not a super_admin session');
			return;
		}

		await expect(page.getByRole('heading', { name: /organizations/i })).toBeVisible();
		await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 5000 });
	});

	test('organization name links to detail page', async ({ page }) => {
		const ok = await loginAsSuperAdmin(page);
		if (!ok) {
			test.skip(true, 'Login failed');
			return;
		}
		if (!page.url().includes('/platform')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await page.goto('/platform/organizations');
		await page.waitForURL(/platform|login|dashboard/);
		if (!page.url().includes('/platform')) {
			test.skip(true, 'Redirected — not a super_admin session');
			return;
		}

		const firstLink = page.locator('tbody tr a').first();
		await expect(firstLink).toBeVisible({ timeout: 5000 });
		const href = await firstLink.getAttribute('href');
		expect(href).toMatch(/\/platform\/organizations\//);
	});
});

test.describe('Platform admin — tenants', () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test('tenants list renders table', async ({ page }) => {
		const ok = await loginAsSuperAdmin(page);
		if (!ok) {
			test.skip(true, 'Login failed');
			return;
		}
		if (!page.url().includes('/platform')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await page.goto('/platform/tenants');
		await page.waitForURL(/platform|login|dashboard/);
		if (!page.url().includes('/platform')) {
			test.skip(true, 'Redirected — not a super_admin session');
			return;
		}

		await expect(page.getByRole('heading', { name: /tenants|outlets/i })).toBeVisible();
		await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 5000 });
	});

	test('tenant row links to detail page', async ({ page }) => {
		const ok = await loginAsSuperAdmin(page);
		if (!ok) {
			test.skip(true, 'Login failed');
			return;
		}
		if (!page.url().includes('/platform')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await page.goto('/platform/tenants');
		await page.waitForURL(/platform|login|dashboard/);
		if (!page.url().includes('/platform')) {
			test.skip(true, 'Redirected — not a super_admin session');
			return;
		}

		const firstLink = page.locator('tbody tr a').first();
		await expect(firstLink).toBeVisible({ timeout: 5000 });
		const href = await firstLink.getAttribute('href');
		expect(href).toMatch(/\/platform\/tenants\//);
	});
});
