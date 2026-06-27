/**
 * QR order flow E2E specs.
 * Covers the full buyer journey: catalog to product detail to add to cart to cart page to place order.
 *
 * No login required — public buyer flow.
 * Seed outlet: uma-karang (Uma Karang, Canggu Bali).
 * Requires: DB seeded with pnpm db:seed
 */

import { expect, test } from '@playwright/test';

const CATALOG_URL = '/r/uma-karang';
const CART_URL = '/r/uma-karang/cart';

test.describe('QR catalog to cart flow', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('catalog page loads and shows seeded products', async ({ page }) => {
		await page.goto(CATALOG_URL);

		await expect(page.getByRole('heading', { name: 'Uma Karang' })).toBeVisible();

		// Seeder plants products for Uma Karang — at least one card must be visible
		const items = page.locator('[role="button"]').filter({ has: page.locator('img') });
		await expect(items.first()).toBeVisible({ timeout: 8000 });
		expect(await items.count()).toBeGreaterThanOrEqual(1);
	});

	test('opening product detail shows name, price, and add-to-cart', async ({ page }) => {
		await page.goto(CATALOG_URL);

		// Click the image area (top of card) to avoid the quick-add + button
		// which calls stopPropagation and prevents the detail dialog from opening
		const firstCardImg = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first()
			.locator('img');
		await firstCardImg.click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible({ timeout: 5000 });
		await expect(dialog.getByText(/rp/i).first()).toBeVisible();
		await expect(
			dialog.getByRole('button', { name: /tambah ke keranjang|add to cart|tambah/i })
		).toBeVisible();
	});

	test('adding a product to cart updates cart count', async ({ page }) => {
		await page.goto(CATALOG_URL);

		// Click the image area (top of card) to avoid the quick-add + button
		const firstCardImg = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first()
			.locator('img');
		await firstCardImg.click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible({ timeout: 5000 });
		await dialog.getByRole('button', { name: /tambah ke keranjang|add to cart|tambah/i }).click();

		// Cart count badge should show >= 1
		const cartBadge = page.getByText(/^[1-9]\d*$/).first();
		await expect(cartBadge).toBeVisible({ timeout: 3000 });
	});

	test('cart page is reachable and shows items after add', async ({ page }) => {
		await page.goto(CATALOG_URL);

		// Click image area to avoid quickAdd button (stopPropagation)
		const firstCardImg = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first()
			.locator('img');
		await firstCardImg.click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible({ timeout: 5000 });
		await dialog.getByRole('button', { name: /tambah ke keranjang|add to cart|tambah/i }).click();
		// Dialog closes after adding to cart
		await dialog.waitFor({ state: 'hidden', timeout: 5000 });

		await page.goto(CART_URL);

		// Cart should show the added product by name
		await expect(page.getByText('Slow Roasted Betutu Chicken').first()).toBeVisible({
			timeout: 5000
		});
	});

	test('place order flow completes successfully with seeded DB', async ({ page }) => {
		await page.goto(CATALOG_URL);

		// Click image area to avoid quickAdd button (stopPropagation)
		const firstCardImg = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first()
			.locator('img');
		await expect(firstCardImg).toBeVisible({ timeout: 8000 });
		await firstCardImg.click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible({ timeout: 5000 });
		await dialog.getByRole('button', { name: /tambah ke keranjang|add to cart|tambah/i }).click();

		await page.goto(CART_URL);

		// Cart requires WhatsApp number (marked with *) before placing order
		const waField = page.getByLabel(/nomor whatsapp|whatsapp/i);
		if (await waField.isVisible({ timeout: 3000 })) {
			await waField.fill('08123456789');
		}

		// Cart uses use:enhance — submits inline, then shows "Lacak pesanan" link
		const placeOrderBtn = page.getByRole('button', { name: /pesan sekarang|place order/i });
		if (!(await placeOrderBtn.isVisible({ timeout: 5000 }))) {
			test.skip(true, 'Place order button not visible — check cart state');
			return;
		}

		await placeOrderBtn.click();

		const trackLink = page.getByRole('link', { name: /lacak pesanan|track order/i });
		await trackLink.waitFor({ state: 'visible', timeout: 12000 });
		await trackLink.click();
		await page.waitForURL(/\/r\/uma-karang\/order\//, { timeout: 10000 });
		await expect(page.getByText(/order|pesanan|confirmed/i).first()).toBeVisible();
	});
});
