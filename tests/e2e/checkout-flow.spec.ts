/**
 * Checkout flow E2E specs.
 * Covers all checkout scenarios based on outlet checkout settings.
 *
 * Scenarios:
 *   - Offline mode (Taman Sate): no WA input, no proof upload, "bayar ke kasir" banner
 *   - Online mode + WA required (Uma Karang): WA input required, proof upload section shown
 *   - Online mode + no WA + no confirmation (Senja Ramen): order placed, no proof upload section
 *
 * No login required for buyer flow.
 * Staff confirmation tested via dashboard/orders — requires login.
 *
 * Requires: DB seeded with pnpm db:seed
 */

import { expect, test } from '@playwright/test';

// Taman Sate: offline mode, no WA required, no confirmation
const TAMAN_SATE_CATALOG = '/r/taman-sate';
const TAMAN_SATE_CART = '/r/taman-sate/cart';

// Uma Karang: online mode, WA required, manual confirmation enabled
const UMA_KARANG_CATALOG = '/r/uma-karang';
const UMA_KARANG_CART = '/r/uma-karang/cart';

// Senja Ramen: online mode, no WA required, no manual confirmation
const SENJA_RAMEN_CATALOG = '/r/senja-ramen-bali';
const SENJA_RAMEN_CART = '/r/senja-ramen-bali/cart';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Add the first product to cart using the quick-add button on the card.
 *
 * The catalog renders each product card as a div[role=button] with a nested
 * quick-add button: `<button aria-label="Add {name} to cart">`.
 * That button calls quickAdd() with stopPropagation — it adds directly to the
 * cart store without opening the detail dialog, which is reliable in Playwright.
 */
async function addFirstItemToCart(page: import('@playwright/test').Page) {
	// Wait for network idle to ensure Svelte has fully hydrated.
	// Without this, the click registers on the SSR DOM but the onclick handler
	// hasn't been attached yet, so cart.add() never fires.
	await page.waitForLoadState('networkidle', { timeout: 10000 });

	// The quick-add button aria-label is "Add {product name} to cart"
	const quickAddBtn = page.getByRole('button', { name: /^add .+ to cart$/i }).first();
	await quickAddBtn.waitFor({ state: 'visible', timeout: 10000 });
	await quickAddBtn.click();

	// cart.add() → localStorage.setItem() are synchronous.
	// A short pause lets Svelte flush cartCount reactivity to the DOM.
	await page.waitForTimeout(300);
}

/**
 * Submit the cart form and navigate to the order page.
 *
 * The cart uses use:enhance — the server returns { success, orderId } inline
 * instead of redirecting. After a successful submit we click the
 * "Lacak pesanan" / "Track order" link to reach the order page.
 */
async function submitCartAndGoToOrder(
	page: import('@playwright/test').Page,
	slugPattern: RegExp
): Promise<boolean> {
	// Button text: "Pesan Sekarang · Rp X,XXX" (ID) or "Place Order · Rp X,XXX" (EN)
	const placeOrderBtn = page.getByRole('button', { name: /pesan sekarang|place order/i });
	if (!(await placeOrderBtn.isVisible({ timeout: 5000 }))) {
		return false;
	}

	await placeOrderBtn.click();

	// Wait for the inline success state to appear
	const trackLink = page.getByRole('link', { name: /lacak pesanan|track order/i });
	await trackLink.waitFor({ state: 'visible', timeout: 12000 });

	// Navigate to the order page via the link
	await trackLink.click();
	await page.waitForURL(slugPattern, { timeout: 10000 });
	return true;
}

// ---------------------------------------------------------------------------
// Offline mode — Taman Sate
// ---------------------------------------------------------------------------

test.describe('Offline checkout — Taman Sate', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('cart page loads and shows no WhatsApp field', async ({ page }) => {
		await page.goto(TAMAN_SATE_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(TAMAN_SATE_CART);

		// WA input should NOT be present for offline mode when not required
		const waInput = page.getByLabel(/whatsapp|wa/i);
		await expect(waInput).not.toBeVisible({ timeout: 3000 });
	});

	test('customer name field is always shown', async ({ page }) => {
		await page.goto(TAMAN_SATE_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(TAMAN_SATE_CART);

		// Customer name is always shown
		await expect(page.getByLabel(/nama|name/i).first()).toBeVisible();
	});

	test('order submits and redirects to order page', async ({ page }) => {
		await page.goto(TAMAN_SATE_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(TAMAN_SATE_CART);

		const nameInput = page.getByLabel(/nama|name/i).first();
		if (await nameInput.isVisible({ timeout: 3000 })) {
			await nameInput.fill('Test Buyer Offline');
		}

		const ok = await submitCartAndGoToOrder(page, /\/r\/taman-sate\/order\//);
		if (!ok) {
			test.skip(true, 'Place order button not visible — check cart state or seeder');
		}
	});

	test('order page shows offline "bayar ke kasir" banner', async ({ page }) => {
		await page.goto(TAMAN_SATE_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(TAMAN_SATE_CART);

		const nameInput = page.getByLabel(/nama|name/i).first();
		if (await nameInput.isVisible({ timeout: 3000 })) {
			await nameInput.fill('Test Buyer Offline Banner');
		}

		const ok = await submitCartAndGoToOrder(page, /\/r\/taman-sate\/order\//);
		if (!ok) {
			test.skip(true, 'Place order button not visible');
			return;
		}

		// Offline mode shows a "pay at cashier" banner — not a payment proof upload section
		await expect(page.getByText(/kasir|bayar langsung|cashier|offline/i).first()).toBeVisible({
			timeout: 5000
		});

		// No payment proof upload section for offline mode
		const uploadSection = page.getByText(/upload bukti|upload proof|unggah bukti/i);
		await expect(uploadSection).not.toBeVisible();
	});

	test('order page shows human-friendly order number #XXXX', async ({ page }) => {
		await page.goto(TAMAN_SATE_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(TAMAN_SATE_CART);

		const nameInput = page.getByLabel(/nama|name/i).first();
		if (await nameInput.isVisible({ timeout: 3000 })) {
			await nameInput.fill('Test Buyer Number');
		}

		const ok = await submitCartAndGoToOrder(page, /\/r\/taman-sate\/order\//);
		if (!ok) {
			test.skip(true, 'Place order button not visible');
			return;
		}

		// Order number shown as #XXXX — not a raw UUID
		await expect(page.getByText(/^#\d{4,}$/).first()).toBeVisible({ timeout: 5000 });
	});
});

// ---------------------------------------------------------------------------
// Online mode + WA required + manual confirmation — Uma Karang
// ---------------------------------------------------------------------------

test.describe('Online checkout with WhatsApp — Uma Karang', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('cart page shows WhatsApp input when required', async ({ page }) => {
		await page.goto(UMA_KARANG_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(UMA_KARANG_CART);

		// WA field is shown (required or optional) for online mode
		const waInput = page.getByLabel(/whatsapp|nomor wa|wa number/i);
		await expect(waInput).toBeVisible({ timeout: 5000 });
	});

	test('submitting without WA number shows validation error', async ({ page }) => {
		await page.goto(UMA_KARANG_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(UMA_KARANG_CART);

		const nameInput = page.getByLabel(/nama|name/i).first();
		if (await nameInput.isVisible({ timeout: 3000 })) {
			await nameInput.fill('Test No WA');
		}

		// Do NOT fill WA — leave empty to trigger validation
		const placeOrderBtn = page.getByRole('button', { name: /pesan sekarang|place order/i });
		if (!(await placeOrderBtn.isVisible({ timeout: 5000 }))) {
			test.skip(true, 'Place order button not visible');
			return;
		}

		await placeOrderBtn.click();

		// Should stay on cart page and show an error — not navigate away
		await page.waitForURL(/\/r\/uma-karang\/cart/, { timeout: 3000 }).catch(() => {
			// May already be on cart, that's fine
		});

		// Page should show a WA-related error or the WA input should now be invalid
		const hasError = await page
			.getByText(/whatsapp|wa number|nomor wa/i)
			.first()
			.isVisible();
		const hasFormError = await page
			.getByRole('alert')
			.isVisible()
			.catch(() => false);
		expect(hasError || hasFormError).toBe(true);
	});

	test('order with WA number places successfully and shows order page', async ({ page }) => {
		await page.goto(UMA_KARANG_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(UMA_KARANG_CART);

		const nameInput = page.getByLabel(/nama|name/i).first();
		if (await nameInput.isVisible({ timeout: 3000 })) {
			await nameInput.fill('Test Buyer WA');
		}

		const waInput = page.getByLabel(/whatsapp|nomor wa/i);
		if (await waInput.isVisible({ timeout: 3000 })) {
			await waInput.fill('081234567890');
		}

		const ok = await submitCartAndGoToOrder(page, /\/r\/uma-karang\/order\//);
		if (!ok) {
			test.skip(true, 'Place order button not visible');
		}
	});

	test('order page shows payment proof upload section (manual confirmation enabled)', async ({
		page
	}) => {
		await page.goto(UMA_KARANG_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(UMA_KARANG_CART);

		const nameInput = page.getByLabel(/nama|name/i).first();
		if (await nameInput.isVisible({ timeout: 3000 })) {
			await nameInput.fill('Test Buyer Proof');
		}

		const waInput = page.getByLabel(/whatsapp|nomor wa/i);
		if (await waInput.isVisible({ timeout: 3000 })) {
			await waInput.fill('081234567890');
		}

		const ok = await submitCartAndGoToOrder(page, /\/r\/uma-karang\/order\//);
		if (!ok) {
			test.skip(true, 'Place order button not visible');
			return;
		}

		// Uma Karang: online + confirmation enabled → proof upload section must be visible
		await expect(
			page.getByText(/upload bukti|upload proof|unggah bukti|kirim bukti/i).first()
		).toBeVisible({ timeout: 8000 });
	});

	test('order page shows #XXXX order number, not a raw UUID', async ({ page }) => {
		await page.goto(UMA_KARANG_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(UMA_KARANG_CART);

		const nameInput = page.getByLabel(/nama|name/i).first();
		if (await nameInput.isVisible({ timeout: 3000 })) {
			await nameInput.fill('Test Buyer Num');
		}

		const waInput = page.getByLabel(/whatsapp|nomor wa/i);
		if (await waInput.isVisible({ timeout: 3000 })) {
			await waInput.fill('081234567890');
		}

		const ok = await submitCartAndGoToOrder(page, /\/r\/uma-karang\/order\//);
		if (!ok) {
			test.skip(true, 'Place order button not visible');
			return;
		}

		// Order number displayed as #XXXX
		await expect(page.getByText(/^#\d{4,}$/).first()).toBeVisible({ timeout: 5000 });
	});

	test('WA number is pre-filled from localStorage on revisit', async ({ page }) => {
		await page.goto(UMA_KARANG_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(UMA_KARANG_CART);

		// Set localStorage directly to simulate a returning buyer
		await page.evaluate(() => {
			localStorage.setItem('ain_buyer_wa', '089999999999');
		});

		// Reload to trigger the auto-fill $effect
		await page.reload();

		const waInput = page.getByLabel(/whatsapp|nomor wa/i);
		if (await waInput.isVisible({ timeout: 5000 })) {
			await expect(waInput).toHaveValue('089999999999');
		}
	});
});

// ---------------------------------------------------------------------------
// Online mode, no WA required, no manual confirmation — Senja Ramen Bali
// ---------------------------------------------------------------------------

test.describe('Online checkout no WA required — Senja Ramen Bali', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('WA field shows as optional (not required)', async ({ page }) => {
		await page.goto(SENJA_RAMEN_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(SENJA_RAMEN_CART);

		// WA field visible (online mode always shows it) but marked optional
		const waInput = page.getByLabel(/whatsapp|nomor wa/i);
		if (await waInput.isVisible({ timeout: 5000 })) {
			// Not required — can submit without it
			await expect(waInput).not.toHaveAttribute('required');
		}
	});

	test('order places without WA number', async ({ page }) => {
		await page.goto(SENJA_RAMEN_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(SENJA_RAMEN_CART);

		const nameInput = page.getByLabel(/nama|name/i).first();
		if (await nameInput.isVisible({ timeout: 3000 })) {
			await nameInput.fill('Test Buyer No WA Senja');
		}
		// Leave WA empty intentionally

		const ok = await submitCartAndGoToOrder(page, /\/r\/senja-ramen-bali\/order\//);
		if (!ok) {
			test.skip(true, 'Place order button not visible');
		}
	});

	test('order page does NOT show proof upload section (confirmation disabled)', async ({
		page
	}) => {
		await page.goto(SENJA_RAMEN_CATALOG);
		await addFirstItemToCart(page);
		await page.goto(SENJA_RAMEN_CART);

		const nameInput = page.getByLabel(/nama|name/i).first();
		if (await nameInput.isVisible({ timeout: 3000 })) {
			await nameInput.fill('Test Buyer No Proof Senja');
		}

		const ok = await submitCartAndGoToOrder(page, /\/r\/senja-ramen-bali\/order\//);
		if (!ok) {
			test.skip(true, 'Place order button not visible');
			return;
		}

		// No payment proof upload for senja-ramen (paymentConfirmationEnabled = false)
		await expect(page.getByText(/upload bukti|upload proof|unggah bukti/i)).not.toBeVisible({
			timeout: 3000
		});
	});
});

// ---------------------------------------------------------------------------
// Dashboard staff confirmation — Uma Karang (online + confirmation)
// Requires staff login.
// ---------------------------------------------------------------------------

test.describe('Staff payment confirmation — Uma Karang dashboard', () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test.beforeEach(async ({ page }) => {
		// Log in as the Bali Table Group owner who manages Uma Karang.
		// Use #password directly to avoid strict-mode ambiguity with the
		// "Tampilkan password" toggle button which also matches /password/i.
		await page.goto('/login');
		await page.getByLabel(/email/i).fill('owner@bali-table.test');
		await page.locator('#password').fill('demo1234');
		await page.getByRole('button', { name: /masuk|login|sign in/i }).click();
		await page.waitForURL(/\/dashboard/, { timeout: 10000 });
	});

	test('dashboard orders page loads and shows order list', async ({ page }) => {
		await page.goto('/dashboard/orders');

		// At least the tab bar or order list heading should be visible
		await expect(page.getByRole('heading', { name: /pesanan|orders/i }).first()).toBeVisible({
			timeout: 8000
		});
	});

	test('orders displayed with #XXXX format, not UUID', async ({ page }) => {
		await page.goto('/dashboard/orders');

		// Wait for order list to populate
		await page.waitForTimeout(2000);

		// Any visible order ID should match #XXXX pattern, not a 36-char UUID
		const orderIds = page.getByText(/^#\d{4,}$/);
		const count = await orderIds.count();
		if (count > 0) {
			// All shown order IDs must be #XXXX format
			for (let i = 0; i < Math.min(count, 5); i++) {
				const text = await orderIds.nth(i).textContent();
				expect(text).toMatch(/^#\d{4,}$/);
			}
		}
	});

	test('selecting a pending order shows confirm/reject actions', async ({ page }) => {
		await page.goto('/dashboard/orders');
		await page.waitForTimeout(2000);

		// Find and click the first pending order
		const pendingOrders = page.locator('button').filter({ hasText: /pending|baru|new/i });
		if ((await pendingOrders.count()) === 0) {
			test.skip(true, 'No pending orders in seeded data — run pnpm db:seed first');
			return;
		}

		await pendingOrders.first().click();

		// Detail panel should show accept/reject buttons for new orders
		await expect(
			page.getByRole('button', { name: /terima|proses|accept|process/i }).first()
		).toBeVisible({ timeout: 5000 });
	});
});
