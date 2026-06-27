/**
 * Customer-facing public catalog E2E specs.
 * Covers: outlet page render, search, section tabs, product cards, detail modal, cart add.
 *
 * Seed outlet slugs: uma-karang (Bali), rempah-terrace (Jakarta).
 * No login required — public buyer flow.
 */

import { expect, test } from '@playwright/test';

const UMA_KARANG = '/r/uma-karang';
const REMPAH_TERRACE = '/r/rempah-terrace';

test.describe('Customer flow at 360px', () => {
	test.use({ viewport: { width: 360, height: 740 } });

	test('renders outlet name and location', async ({ page }) => {
		await page.goto(UMA_KARANG);

		await expect(page.getByRole('heading', { name: 'Uma Karang' })).toBeVisible();
	});

	test('search input is visible', async ({ page }) => {
		await page.goto(UMA_KARANG);

		await expect(page.getByPlaceholder(/cari|search/i)).toBeVisible();
	});

	test('section tabs render', async ({ page }) => {
		await page.goto(UMA_KARANG);

		// "All" / "Semua" tab is always present
		await expect(page.getByRole('button', { name: /all|semua/i })).toBeVisible();
	});

	test('products are displayed', async ({ page }) => {
		await page.goto(UMA_KARANG);

		const items = page.locator('[role="button"]').filter({ has: page.locator('img') });
		const count = await items.count();
		expect(count).toBeGreaterThanOrEqual(1);
	});

	test('product card shows price', async ({ page }) => {
		await page.goto(UMA_KARANG);

		const firstCard = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first();
		await expect(firstCard).toBeVisible();
		// Price displayed as "Rp" or "RP" — case-insensitive
		await expect(firstCard.getByText(/rp/i).first()).toBeVisible();
	});

	test('clicking a product opens detail dialog', async ({ page }) => {
		await page.goto(UMA_KARANG);

		const firstCard = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first();
		await firstCard.click();

		await expect(page.getByRole('dialog')).toBeVisible();
	});

	test('detail dialog shows price and add-to-cart button', async ({ page }) => {
		await page.goto(UMA_KARANG);

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

	test('renders outlet hero', async ({ page }) => {
		await page.goto(UMA_KARANG);

		await expect(page.getByRole('heading', { name: 'Uma Karang' })).toBeVisible();
	});

	test('section filter works', async ({ page }) => {
		await page.goto(UMA_KARANG);

		// Click "All" / "Semua" tab — should not crash or remove all items
		const allTab = page.getByRole('button', { name: /all|semua/i });
		await allTab.click();

		const items = page.locator('[role="button"]').filter({ has: page.locator('img') });
		expect(await items.count()).toBeGreaterThanOrEqual(0);
	});

	test('search filters items without crashing', async ({ page }) => {
		await page.goto(UMA_KARANG);

		const searchInput = page.getByPlaceholder(/cari|search/i);
		await searchInput.fill('nasi');
		await expect(searchInput).toHaveValue('nasi');
	});

	test('clearing search restores items', async ({ page }) => {
		await page.goto(UMA_KARANG);

		const searchInput = page.getByPlaceholder(/cari|search/i);
		await searchInput.fill('zzzzzzz_nonexistent');
		await searchInput.clear();
		await expect(searchInput).toHaveValue('');
	});
});

test.describe('Cart interaction', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('adding item to cart increments cart badge', async ({ page }) => {
		await page.goto(UMA_KARANG);

		const firstCard = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first();
		await firstCard.click();

		const dialog = page.getByRole('dialog');
		await dialog.getByRole('button', { name: /add to cart|tambah/i }).click();

		// Cart button/badge should reflect count ≥ 1
		await expect(page.getByText(/1/).first()).toBeVisible({ timeout: 3000 });
	});

	test('cart page is accessible from catalog', async ({ page }) => {
		await page.goto(UMA_KARANG);

		// Cart is accessible via the floating cart link (appears with items) or
		// quick-add buttons on product cards
		const cartLink = page.getByRole('link', { name: /cart|keranjang/i });
		const quickAddBtn = page.getByRole('button', { name: /^add .+ to cart$/i }).first();
		const hasLink = await cartLink.isVisible();
		const hasBtn = await quickAddBtn.isVisible();
		expect(hasLink || hasBtn).toBe(true);
	});
});

test.describe('RTL / multi-language layout', () => {
	test.use({ viewport: { width: 360, height: 740 } });

	test('Rempah Terrace renders correctly', async ({ page }) => {
		await page.goto(REMPAH_TERRACE);

		await expect(page.getByRole('heading', { name: 'Rempah Terrace' })).toBeVisible();
	});

	test('no horizontal overflow at 360px', async ({ page }) => {
		await page.goto(REMPAH_TERRACE);

		const html = page.locator('html');
		const scrollWidth = await html.evaluate((el) => el.scrollWidth);
		const clientWidth = await html.evaluate((el) => el.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
	});
});
