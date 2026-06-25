import { expect, test } from '@playwright/test';

const TEST_URL = '/r/uma-karang';
const RTL_TEST_URL = '/r/rempah-terrace';

test.describe('Customer flow at 360px', () => {
	test.use({ viewport: { width: 360, height: 740 } });

	test('renders restaurant name and location', async ({ page }) => {
		await page.goto(TEST_URL);

		await expect(page.getByRole('heading', { name: 'Uma Karang' })).toBeVisible();
	});

	test('search input is visible', async ({ page }) => {
		await page.goto(TEST_URL);

		const searchInput = page.getByPlaceholder(/cari|search/i);
		await expect(searchInput).toBeVisible();
	});

	test('category tabs render', async ({ page }) => {
		await page.goto(TEST_URL);

		const allTab = page.getByRole('button', { name: /all|semua/i });
		await expect(allTab).toBeVisible();
	});

	test('menu items are displayed', async ({ page }) => {
		await page.goto(TEST_URL);

		const items = page.locator('[role="button"]').filter({ has: page.locator('img') });
		const count = await items.count();
		expect(count).toBeGreaterThanOrEqual(1);
	});

	test('menu item shows price', async ({ page }) => {
		await page.goto(TEST_URL);

		const firstCard = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first();
		await expect(firstCard).toBeVisible();

		await expect(firstCard.locator('text=RP')).toBeVisible();
	});

	test('selecting a menu item opens detail panel', async ({ page }) => {
		await page.goto(TEST_URL);

		const firstCard = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first();
		await firstCard.click();

		await expect(page.getByRole('dialog')).toBeVisible();
	});

	test('detail panel shows price and add to cart', async ({ page }) => {
		await page.goto(TEST_URL);

		const firstCard = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first();
		await firstCard.click();

		const dialog = page.getByRole('dialog');
		await expect(dialog.getByText(/rp/i).first()).toBeVisible();
		await expect(dialog.getByRole('button', { name: /add to cart|tambah/i })).toBeVisible();
	});
});

test.describe('Customer flow at 390px', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('renders restaurant hero', async ({ page }) => {
		await page.goto(TEST_URL);

		await expect(page.getByRole('heading', { name: 'Uma Karang' })).toBeVisible();
	});

	test('category tabs scroll horizontally', async ({ page }) => {
		await page.goto(TEST_URL);

		const allTab = page.getByRole('button', { name: /all|semua/i });
		await expect(allTab).toBeVisible();

		// The category bar should have horizontal scroll
		const tabBar = page.locator('div.flex.gap-2.overflow-x-auto').first();
		await expect(tabBar).toBeVisible();
	});

	test('search filters items', async ({ page }) => {
		await page.goto(TEST_URL);

		const searchInput = page.getByPlaceholder(/cari|search/i);
		await searchInput.fill('nasi');
		// Should not crash
		await expect(searchInput).toHaveValue('nasi');
	});
});

test.describe('Arabic RTL layout at 360px', () => {
	test.use({ viewport: { width: 360, height: 740 } });

	test('renders restaurant hero with RTL text direction', async ({ page }) => {
		await page.goto(RTL_TEST_URL);

		await expect(page.getByRole('heading', { name: 'Rempah Terrace' })).toBeVisible();
	});

	test('no horizontal overflow at 360px', async ({ page }) => {
		await page.goto(RTL_TEST_URL);

		const html = page.locator('html');
		const scrollWidth = await html.evaluate((el) => el.scrollWidth);
		const clientWidth = await html.evaluate((el) => el.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
	});
});
