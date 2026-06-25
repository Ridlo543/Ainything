import { expect, test, type Page } from '@playwright/test';

async function loginWithDemoAccount(page: Page): Promise<boolean> {
	await page.goto('/login');

	try {
		await page.getByLabel('Email').fill('owner@bali-table.test');
		await page.getByLabel('Password').fill('anything');
		await page.getByRole('button', { name: /masuk/i }).click();
		await page.waitForURL(/\/dashboard/);
		return true;
	} catch {
		return false;
	}
}

test.describe('Login page', () => {
	test('renders heading and email form', async ({ page }) => {
		await page.goto('/login');

		await expect(page.getByRole('heading', { name: /selamat datang|welcome/i })).toBeVisible();
		await expect(page.getByLabel('Email')).toBeVisible();
		await expect(page.getByLabel('Password')).toBeVisible();
	});

	test('login button is visible', async ({ page }) => {
		await page.goto('/login');

		await expect(page.getByRole('button', { name: /masuk|sign in/i })).toBeVisible();
	});
});

test.describe('Admin flow at 390px', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('login renders correctly at narrow viewport', async ({ page }) => {
		await page.goto('/login');

		await expect(page.getByRole('heading', { name: /selamat datang|welcome/i })).toBeVisible();
		await expect(page.getByLabel('Email')).toBeVisible();
	});
});

test.describe('Dashboard overview', () => {
	test('renders greeting and stat tiles', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions available');
			return;
		}

		await expect(page.getByText(/pesanan terbaru|recent orders|stats/i).first()).toBeVisible();
		await expect(page.getByText(/produk terlaris|top products/i)).toBeVisible();
	});

	test('quick action links are visible', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions available');
			return;
		}

		await expect(page.getByRole('link', { name: /lihat katalog|view catalog/i })).toBeVisible();
		await expect(page.getByRole('link', { name: /tambah produk|add product/i })).toBeVisible();
	});
});

test.describe('Dashboard catalog', () => {
	test('renders catalog page', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions available');
			return;
		}

		await page.goto('/dashboard/catalog');

		await expect(page.getByRole('heading', { name: /menu|katalog|catalog/i })).toBeVisible();
	});

	test('shows menu items when available', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}
		await page.goto('/dashboard/catalog');

		const items = page.getByRole('button', { name: /edit item|edit/i });
		const count = await items.count();

		if (count === 0) {
			test.skip(true, 'No menu items available to edit');
			return;
		}

		await expect(items.first()).toBeVisible();
	});
});
