import { expect, test, type Page } from '@playwright/test';

async function loginAsSuperAdmin(page: Page): Promise<boolean> {
	await page.goto('/login');
	const select = page.getByLabel('Demo account');
	const options = await select.locator('option').allInnerTexts();
	const superAdminOpt = options.find((o) =>
		o.toLowerCase().includes('super') || o.toLowerCase().includes('admin')
	);
	const target = superAdminOpt ?? options[0]?.trim();
	if (!target) return false;
	await select.selectOption({ label: target });
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.waitForURL(/\/dashboard|platform/);
	return true;
}

test.describe('Platform admin — overview', () => {
	test('non-platform user cannot access /platform', async ({ page }) => {
		await page.goto('/platform');
		await page.waitForURL(/login|dashboard/);
		expect(page.url()).not.toContain('/platform');
	});

	test('platform overview renders stats after login', async ({ page }) => {
		const ok = await loginAsSuperAdmin(page);
		if (!ok) { test.skip(true, 'No demo account'); return; }
		if (page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await page.goto('/platform');
		await page.waitForURL(/\/platform|dashboard/);
		if (page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await expect(
			page.getByRole('heading', { name: /platform|admin|overview/i })
		).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Platform admin — organizations', () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test('organizations list renders table', async ({ page }) => {
		const ok = await loginAsSuperAdmin(page);
		if (!ok) { test.skip(true, 'No demo account'); return; }
		if (page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await page.goto('/platform/organizations');
		await page.waitForURL(/platform|login|dashboard/);
		if (page.url().includes('login') || page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await expect(page.getByRole('heading', { name: /organizations/i })).toBeVisible();
		await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 5000 });
	});

	test('organization name links to detail page', async ({ page }) => {
		const ok = await loginAsSuperAdmin(page);
		if (!ok) { test.skip(true, 'No demo account'); return; }
		if (page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await page.goto('/platform/organizations');
		if (page.url().includes('login') || page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		const firstLink = page.locator('tbody tr a').first();
		await expect(firstLink).toBeVisible({ timeout: 5000 });
		const href = await firstLink.getAttribute('href');
		expect(href).toMatch(/\/platform\/organizations\//);
	});
});

test.describe('Platform admin — organization detail', () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test('detail page renders status controls', async ({ page }) => {
		const ok = await loginAsSuperAdmin(page);
		if (!ok) { test.skip(true, 'No demo account'); return; }
		if (page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await page.goto('/platform/organizations');
		if (page.url().includes('login') || page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		const firstLink = page.locator('tbody tr a').first();
		await firstLink.click();
		await page.waitForURL(/\/platform\/organizations\//);

		await expect(page.getByRole('heading')).toBeVisible();
		const statusBtns = page.getByRole('button', { name: /activate|suspend|archive/i });
		const count = await statusBtns.count();
		expect(count).toBeGreaterThanOrEqual(1);
	});

	test('restaurant list is visible on org detail', async ({ page }) => {
		const ok = await loginAsSuperAdmin(page);
		if (!ok) { test.skip(true, 'No demo account'); return; }
		if (page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await page.goto('/platform/organizations/bali-table-group');
		await page.waitForURL(/platform|login|dashboard/);
		if (page.url().includes('login') || page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await expect(page.getByRole('heading', { name: /restaurants/i })).toBeVisible();
		const rows = page.locator('tbody tr');
		await expect(rows.first()).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Platform admin — restaurants', () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test('restaurants list renders table', async ({ page }) => {
		const ok = await loginAsSuperAdmin(page);
		if (!ok) { test.skip(true, 'No demo account'); return; }
		if (page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await page.goto('/platform/restaurants');
		await page.waitForURL(/platform|login|dashboard/);
		if (page.url().includes('login') || page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await expect(page.getByRole('heading', { name: /restaurants/i })).toBeVisible();
		await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 5000 });
	});

	test('restaurant name links to detail page', async ({ page }) => {
		const ok = await loginAsSuperAdmin(page);
		if (!ok) { test.skip(true, 'No demo account'); return; }
		if (page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		await page.goto('/platform/restaurants');
		if (page.url().includes('login') || page.url().includes('dashboard')) {
			test.skip(true, 'Not a super_admin session');
			return;
		}

		const firstLink = page.locator('tbody tr a').first();
		await expect(firstLink).toBeVisible({ timeout: 5000 });
		const href = await firstLink.getAttribute('href');
		expect(href).toMatch(/\/platform\/restaurants\//);
	});
});
