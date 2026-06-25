import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, email: string) {
	await page.goto('/login');
	await page.getByLabel('Email').fill(email);
	await page.locator('#password').fill('anything');
	await page.getByRole('button', { name: /masuk/i }).click();
}

test('customer public catalog renders menu and search', async ({ page }) => {
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

	await expect(page).toHaveURL(/\/dashboard/);
	await page.goto('/dashboard/catalog');
	await expect(page.getByRole('heading', { name: /katalog/i })).toBeVisible();
});

test('staff inbox redirects to login and can access after auth', async ({ page }) => {
	await page.goto('/staff/inbox');

	await expect(page).toHaveURL(/\/login/);
	await loginAs(page, 'staff@jakarta-hospitality.test');
	await page.waitForURL(/\/staff\/inbox/);
});
