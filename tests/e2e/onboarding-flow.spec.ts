/**
 * Onboarding wizard E2E specs.
 * Covers: registration confirm page, setup step 2 (tables), step 3 (menu), step 4 (QR).
 */

import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// Registration confirm
// ---------------------------------------------------------------------------

test.describe('Registration confirm page', () => {
	test('renders email confirmation message', async ({ page }) => {
		await page.goto('/register/confirm');
		await expect(page.getByText(/check your email|confirm your email/i)).toBeVisible();
	});

	test('has link back to login', async ({ page }) => {
		await page.goto('/register/confirm');
		// Link text is 'Continue to sign in' — matches /sign in/i
		await expect(
			page.getByRole('link', { name: /continue.*sign in|sign in|login/i })
		).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Onboarding wizard (requires authenticated session)
// ---------------------------------------------------------------------------

test.describe('Onboarding wizard', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	async function loginAndGoToOnboarding(page: import('@playwright/test').Page) {
		await page.goto('/login');
		const select = page.getByLabel('Demo account');
		const options = await select.locator('option').allInnerTexts();
		const first = options[0]?.trim();
		if (!first) return false;
		await select.selectOption({ label: first });
		await page.getByRole('button', { name: 'Continue' }).click();
		await page.waitForURL(/\/dashboard/);
		await page.goto('/dashboard/onboarding?step=1');
		return true;
	}

	test('step 1 shows restaurant profile summary', async ({ page }) => {
		const ok = await loginAndGoToOnboarding(page);
		if (!ok) {
			test.skip(true, 'No demo account');
			return;
		}

		await expect(page.getByText(/restaurant profile is set up/i)).toBeVisible();
		await expect(page.getByRole('link', { name: /continue/i })).toBeVisible();
	});

	test('step 1 continue link points to step 2', async ({ page }) => {
		const ok = await loginAndGoToOnboarding(page);
		if (!ok) {
			test.skip(true, 'No demo account');
			return;
		}

		const continueLink = page.getByRole('link', { name: /continue/i });
		await expect(continueLink).toHaveAttribute('href', '/dashboard/onboarding?step=2');
	});

	test('step 2 shows table setup form', async ({ page }) => {
		const ok = await loginAndGoToOnboarding(page);
		if (!ok) {
			test.skip(true, 'No demo account');
			return;
		}

		await page.goto('/dashboard/onboarding?step=2');
		await expect(page.getByRole('heading', { name: /set up tables/i })).toBeVisible();
		await expect(page.getByLabel(/number of tables/i)).toBeVisible();
		await expect(page.getByLabel(/code prefix/i)).toBeVisible();
	});

	test('step 2 prefix preview updates on input', async ({ page }) => {
		const ok = await loginAndGoToOnboarding(page);
		if (!ok) {
			test.skip(true, 'No demo account');
			return;
		}

		await page.goto('/dashboard/onboarding?step=2');
		const prefixInput = page.getByLabel(/code prefix/i);
		await prefixInput.fill('A');
		await expect(page.getByText(/A01/)).toBeVisible();
	});

	test('step 3 shows create menu button', async ({ page }) => {
		const ok = await loginAndGoToOnboarding(page);
		if (!ok) {
			test.skip(true, 'No demo account');
			return;
		}

		await page.goto('/dashboard/onboarding?step=3');
		await expect(page.getByRole('heading', { name: /create.*menu/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /create draft menu/i })).toBeVisible();
	});

	test('step 4 shows completion and action links', async ({ page }) => {
		const ok = await loginAndGoToOnboarding(page);
		if (!ok) {
			test.skip(true, 'No demo account');
			return;
		}

		await page.goto('/dashboard/onboarding?step=4');
		await expect(page.getByText(/all set|you're all set/i)).toBeVisible();
		await expect(page.getByRole('link', { name: /view qr codes/i })).toBeVisible();
		await expect(page.getByRole('link', { name: /import menu/i })).toBeVisible();
	});

	test('step progress indicator is visible', async ({ page }) => {
		const ok = await loginAndGoToOnboarding(page);
		if (!ok) {
			test.skip(true, 'No demo account');
			return;
		}

		// Step indicator should show 4 steps
		const steps = page.locator('ol li');
		await expect(steps).toHaveCount(4); // 4 steps in the progress indicator
	});
});
