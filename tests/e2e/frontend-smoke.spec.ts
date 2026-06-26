/**
 * Frontend smoke tests.
 * Fast sanity checks: public catalog, admin login + dashboard, staff auth guard.
 *
 * Auth: MockAuthProvider — email+password form, password ignored (min 1 char).
 */

import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, email: string) {
	await page.goto('/login');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill('demo');
	await page.getByRole('button', { name: /masuk/i }).click();
}

test('customer public catalog renders products and search', async ({ page }) => {
	await page.goto('/r/uma-karang');

	await expect(page.getByRole('heading', { name: 'Uma Karang' })).toBeVisible();
	await expect(page.getByPlaceholder(/cari|search/i)).toBeVisible();

	const items = page.locator('[role="button"]').filter({ has: page.locator('img') });
	const count = await items.count();
	expect(count).toBeGreaterThanOrEqual(1);

	const firstCard = items.first();
	await firstCard.click();
	await expect(page.getByRole('dialog')).toBeVisible();
});

test('admin catalog page renders after login', async ({ page }) => {
	await loginAs(page, 'owner@bali-table.test');

	await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 });
	await page.goto('/dashboard/catalog');
	await expect(page.getByRole('heading', { name: /katalog|catalog/i })).toBeVisible();
});

test('staff inbox redirects to login when unauthenticated', async ({ page }) => {
	await page.goto('/staff/inbox');

	await expect(page).toHaveURL(/\/login/);
});

test('staff can access inbox after login', async ({ page }) => {
	await loginAs(page, 'staff@jakarta-hospitality.test');
	await page.waitForURL(/\/staff\/inbox|\/dashboard/, { timeout: 8000 });

	if (!page.url().includes('inbox')) {
		await page.goto('/staff/inbox');
	}

	await expect(page).toHaveURL(/\/staff\/inbox/);
});
