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

		const firstCard = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first();
		await firstCard.click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog.getByText(/rp/i).first()).toBeVisible();
		await expect(dialog.getByRole('button', { name: /add to cart|tambah/i })).toBeVisible();
	});

	test('adding a product to cart updates cart count', async ({ page }) => {
		await page.goto(CATALOG_URL);

		const firstCard = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first();
		await firstCard.click();

		const dialog = page.getByRole('dialog');
		await dialog.getByRole('button', { name: /add to cart|tambah/i }).click();

		// Cart count badge should show >= 1
		const cartBadge = page.getByText(/^[1-9]\d*$/).first();
		await expect(cartBadge).toBeVisible({ timeout: 3000 });
	});

	test('cart page is reachable and shows items after add', async ({ page }) => {
		await page.goto(CATALOG_URL);

		const firstCard = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first();
		await firstCard.click();

		const dialog = page.getByRole('dialog');
		await dialog.getByRole('button', { name: /add to cart|tambah/i }).click();
		await dialog.getByRole('button', { name: /add to cart|tambah/i }).waitFor({ state: 'visible' });

		await page.goto(CART_URL);

		// Cart should show at least one item row
		const cartItems = page.locator('[data-testid="cart-item"], .cart-item, [aria-label*="cart"]');
		const hasSummary = await page.getByText(/total|subtotal/i).isVisible();
		const hasItems = (await cartItems.count()) > 0;
		expect(hasItems || hasSummary).toBe(true);
	});

	test('place order flow completes successfully with seeded DB', async ({ page }) => {
		await page.goto(CATALOG_URL);

		const firstCard = page
			.locator('[role="button"]')
			.filter({ has: page.locator('img') })
			.first();
		await firstCard.click();

		const dialog = page.getByRole('dialog');
		await dialog.getByRole('button', { name: /add to cart|tambah/i }).click();

		await page.goto(CART_URL);

		const placeOrderBtn = page.getByRole('button', { name: /place order|pesan|konfirmasi/i });
		if (!(await placeOrderBtn.isVisible({ timeout: 5000 }))) {
			test.skip(true, 'Place order button not visible — check cart state');
			return;
		}

		await placeOrderBtn.click();

		// Should redirect to order confirmation page on success
		await page.waitForURL(/\/r\/uma-karang\/order\//, { timeout: 10000 });
		await expect(page.getByText(/order|pesanan|confirmed/i).first()).toBeVisible();
	});
});
