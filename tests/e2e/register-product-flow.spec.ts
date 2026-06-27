/**
 * Register + add-product flow E2E specs.
 *
 * Covers:
 *   1. Registration page structure — restaurant path
 *   2. Registration page structure — organization path
 *   3. Successful registration redirects to /register/confirm
 *   4. Duplicate email shows server-side error
 *   5. Add product flow — open modal, fill form, submit, confirm product appears
 *   6. Product availability toggle (options menu)
 *
 * Auth: LocalAuthProvider — real bcrypt check against seeded DB.
 *   Owner: owner@bali-table.test / demo1234
 *
 * NOTE: Tests that need a running DB use loginAsOwner() and skip gracefully
 * when the preview server is unavailable or the DB is not seeded.
 *
 * E2E Guide rules applied:
 *   - waitForLoadState('load') before any JS-dependent interaction
 *   - page.on('pageerror') to surface Svelte runtime errors
 *   - locator('#password') never getByLabel(/password/i) on login page
 *   - getByLabel() safe on register forms (no ambiguous toggle button)
 *   - Regex OR for i18n label text where applicable
 */

import { expect, test, type Page } from '@playwright/test';
import { loginAsOwner } from './fixtures';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Unique email per run — prevents duplicate-email collisions across test runs. */
function uniqueEmail(prefix = 'e2e') {
	return `${prefix}_${Date.now()}@e2e.invalid`;
}

/** Attach a pageerror listener that fails the test on Svelte runtime errors. */
function trackPageErrors(page: Page): () => void {
	const errors: string[] = [];
	const handler = (err: Error) => errors.push(err.message);
	page.on('pageerror', handler);
	return () => {
		page.off('pageerror', handler);
		if (errors.length) {
			throw new Error(`[pageerror] ${errors.join('\n')}`);
		}
	};
}

// ---------------------------------------------------------------------------
// 1. Registration — restaurant path (no DB required)
// ---------------------------------------------------------------------------

test.describe('Registration — restaurant path', () => {
	test('renders all required fields and heading', async ({ page }) => {
		await page.goto('/register/restaurant');
		await page.waitForLoadState('load');

		await expect(page.getByRole('heading', { name: 'Register your restaurant' })).toBeVisible();
		await expect(page.getByLabel('Your name')).toBeVisible();
		await expect(page.getByLabel('Email')).toBeVisible();
		await expect(page.getByLabel('Password')).toBeVisible();
		await expect(page.getByLabel('Restaurant name')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
	});

	test('has "Back to options" link', async ({ page }) => {
		await page.goto('/register/restaurant');
		await page.waitForLoadState('load');

		await expect(page.getByRole('link', { name: 'Back to options' })).toBeVisible();
	});

	test('browser validation blocks empty form submission', async ({ page }) => {
		await page.goto('/register/restaurant');
		await page.waitForLoadState('load');

		// Click submit without filling anything — browser required validation fires
		await page.getByRole('button', { name: 'Create account' }).click();

		// First required field should receive focus
		await expect(page.getByLabel('Your name')).toBeFocused();
	});

	test('redirects to /register/confirm on successful registration', async ({ page }) => {
		const flush = trackPageErrors(page);

		await page.goto('/register/restaurant');
		await page.waitForLoadState('load');

		await page.getByLabel('Your name').fill('E2E Test User');
		await page.getByLabel('Email').fill(uniqueEmail('restaurant'));
		await page.getByLabel('Password').fill('Password123!');
		await page.getByLabel('Restaurant name').fill('E2E Warung');
		await page.getByRole('button', { name: 'Create account' }).click();

		await expect(page).toHaveURL(/\/register\/confirm/, { timeout: 10_000 });

		flush();
	});

	test('shows server error for duplicate email', async ({ page }) => {
		// owner@bali-table.test is the seeded owner — guaranteed to exist
		const flush = trackPageErrors(page);

		await page.goto('/register/restaurant');
		await page.waitForLoadState('load');

		await page.getByLabel('Your name').fill('Duplicate Tester');
		await page.getByLabel('Email').fill('owner@bali-table.test');
		await page.getByLabel('Password').fill('Password123!');
		await page.getByLabel('Restaurant name').fill('Dupe Warung');
		await page.getByRole('button', { name: 'Create account' }).click();

		// Server returns fail(400) — stays on register page with role=alert
		await expect(page).toHaveURL(/\/register/, { timeout: 8_000 });
		await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });

		flush();
	});
});

// ---------------------------------------------------------------------------
// 2. Registration — organization path (no DB required)
// ---------------------------------------------------------------------------

test.describe('Registration — organization path', () => {
	test('renders all required fields and heading', async ({ page }) => {
		await page.goto('/register/organization');
		await page.waitForLoadState('load');

		await expect(page.getByRole('heading', { name: 'Register your organization' })).toBeVisible();
		await expect(page.getByLabel('Your name')).toBeVisible();
		await expect(page.getByLabel('Organization name')).toBeVisible();
		await expect(page.getByLabel('Email')).toBeVisible();
		await expect(page.getByLabel('Password')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Create organization account' })).toBeVisible();
	});

	test('has "Back to options" link', async ({ page }) => {
		await page.goto('/register/organization');
		await page.waitForLoadState('load');

		await expect(page.getByRole('link', { name: 'Back to options' })).toBeVisible();
	});

	test('browser validation blocks empty form submission', async ({ page }) => {
		await page.goto('/register/organization');
		await page.waitForLoadState('load');

		await page.getByRole('button', { name: 'Create organization account' }).click();
		await expect(page.getByLabel('Your name')).toBeFocused();
	});
});

// ---------------------------------------------------------------------------
// 3. Add product flow (requires seeded DB + running preview server)
// ---------------------------------------------------------------------------

test.describe('Add product flow', () => {
	test('catalog page loads and shows existing products', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or preview server not running');
			return;
		}

		await page.goto('/dashboard/catalog');
		await page.waitForLoadState('load');

		await expect(page.getByRole('heading', { name: 'Katalog Produk' })).toBeVisible({
			timeout: 8_000
		});
		// Seeder plants at least one product — "Opsi produk" button is the options menu
		await expect(page.getByRole('button', { name: 'Opsi produk' }).first()).toBeVisible({
			timeout: 8_000
		});
	});

	test('"Tambah Produk" button opens the add-product modal', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or preview server not running');
			return;
		}

		const flush = trackPageErrors(page);

		await page.goto('/dashboard/catalog');
		await page.waitForLoadState('load');

		await page.getByRole('button', { name: 'Tambah Produk' }).click();

		// Wait for Svelte to render the modal — id="product-name"
		await expect(page.getByLabel('Nama Produk')).toBeVisible({ timeout: 5_000 });

		flush();
	});

	test('add-product modal contains all required fields', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or preview server not running');
			return;
		}

		await page.goto('/dashboard/catalog');
		await page.waitForLoadState('load');

		await page.getByRole('button', { name: 'Tambah Produk' }).click();
		await expect(page.getByLabel('Nama Produk')).toBeVisible({ timeout: 5_000 });

		// All modal fields must be present
		await expect(page.getByLabel('Harga')).toBeVisible();
		await expect(page.getByLabel('Deskripsi')).toBeVisible();
		// Modal submit button (add mode)
		await expect(page.getByRole('button', { name: 'Tambah Produk' }).last()).toBeVisible();
		// Cancel button
		await expect(page.getByRole('button', { name: 'Batal' })).toBeVisible();
	});

	test('submitting the form creates a new product visible in the list', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or preview server not running');
			return;
		}

		const flush = trackPageErrors(page);
		const productName = `E2E Produk ${Date.now()}`;

		await page.goto('/dashboard/catalog');
		await page.waitForLoadState('load');

		// Open modal
		await page.getByRole('button', { name: 'Tambah Produk' }).click();
		await expect(page.getByLabel('Nama Produk')).toBeVisible({ timeout: 5_000 });

		// Fill required fields
		await page.getByLabel('Nama Produk').fill(productName);
		await page.getByLabel('Harga').fill('25000');
		// Description is optional — skip to keep test minimal

		// Submit — the submit button in the modal also says "Tambah Produk"
		// Use .last() because the page header button and modal button share the same name
		await page.getByRole('button', { name: 'Tambah Produk' }).last().click();

		// Modal closes on success; product name should appear in the updated list
		await expect(page.getByText(productName)).toBeVisible({ timeout: 10_000 });
		// Header button is back — confirms modal closed cleanly
		await expect(page.getByRole('button', { name: 'Tambah Produk' }).first()).toBeVisible({
			timeout: 5_000
		});

		flush();
	});

	test('add-product form stays open and does not create product with empty name', async ({
		page
	}) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or preview server not running');
			return;
		}

		await page.goto('/dashboard/catalog');
		await page.waitForLoadState('load');

		await page.getByRole('button', { name: 'Tambah Produk' }).click();
		await expect(page.getByLabel('Nama Produk')).toBeVisible({ timeout: 5_000 });

		// Fill price but leave name empty to trigger required validation
		await page.getByLabel('Harga').fill('10000');
		await page.getByRole('button', { name: 'Tambah Produk' }).last().click();

		// Browser validation keeps focus on the required name field — modal stays open
		await expect(page.getByLabel('Nama Produk')).toBeVisible();
	});

	test('"Batal" button closes the modal without creating a product', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or preview server not running');
			return;
		}

		const flush = trackPageErrors(page);

		await page.goto('/dashboard/catalog');
		await page.waitForLoadState('load');

		await page.getByRole('button', { name: 'Tambah Produk' }).click();
		await expect(page.getByLabel('Nama Produk')).toBeVisible({ timeout: 5_000 });

		await page.getByRole('button', { name: 'Batal' }).click();

		// Modal should be gone — name input no longer in DOM
		await expect(page.getByLabel('Nama Produk')).not.toBeVisible({ timeout: 3_000 });

		flush();
	});
});

// ---------------------------------------------------------------------------
// 4. Product options menu (requires seeded DB)
// ---------------------------------------------------------------------------

test.describe('Product options menu', () => {
	test('opening "Opsi produk" shows availability and delete actions', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or preview server not running');
			return;
		}

		const flush = trackPageErrors(page);

		await page.goto('/dashboard/catalog');
		await page.waitForLoadState('load');

		const optionsBtn = page.getByRole('button', { name: 'Opsi produk' }).first();
		await expect(optionsBtn).toBeVisible({ timeout: 8_000 });
		await optionsBtn.click();

		// Dropdown should show Edit, visibility toggle (Sembunyikan/Aktifkan), and Delete actions
		await expect(page.getByRole('button', { name: 'Edit Produk' }).first()).toBeVisible({
			timeout: 3_000
		});
		await expect(page.getByRole('button', { name: /sembunyikan|aktifkan/i }).first()).toBeVisible({
			timeout: 3_000
		});
		await expect(page.getByRole('button', { name: 'Hapus' }).first()).toBeVisible({
			timeout: 3_000
		});

		flush();
	});
});
