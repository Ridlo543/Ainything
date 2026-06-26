/**
 * Onboarding wizard E2E specs.
 * Covers: registration confirm page, setup steps 1–4.
 *
 * Auth: LocalAuthProvider — real bcrypt password check against seeded DB.
 * Owner: owner@bali-table.test / demo1234
 */

import { expect, test } from '@playwright/test';
import { loginAsOwner } from './fixtures';

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
		await expect(
			page.getByRole('link', { name: /continue.*sign in|sign in|login/i })
		).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Onboarding wizard (requires authenticated owner session)
// ---------------------------------------------------------------------------

test.describe('Onboarding wizard', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	async function loginAndGoToOnboarding(page: import('@playwright/test').Page) {
		const ok = await loginAsOwner(page);
		if (!ok) return false;
		await page.goto('/dashboard/onboarding?step=1');
		return true;
	}

	test('step 1 shows outlet profile summary', async ({ page }) => {
		const ok = await loginAndGoToOnboarding(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await expect(
			page.getByText(/outlet profile|profile is set up|profile sudah|bisnis/i)
		).toBeVisible();
		await expect(page.getByRole('link', { name: /continue/i })).toBeVisible();
	});

	test('step 1 continue link points to step 2', async ({ page }) => {
		const ok = await loginAndGoToOnboarding(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		const continueLink = page.getByRole('link', { name: /continue/i });
		await expect(continueLink).toHaveAttribute('href', /step=2/);
	});

	test('step 3 shows menu creation button', async ({ page }) => {
		const ok = await loginAndGoToOnboarding(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await page.goto('/dashboard/onboarding?step=3');
		await expect(page.getByRole('button', { name: /create draft|katalog|menu/i })).toBeVisible();
	});

	test('step 4 shows completion and action links', async ({ page }) => {
		const ok = await loginAndGoToOnboarding(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await page.goto('/dashboard/onboarding?step=4');
		await expect(page.getByText(/all set|you're all set|selesai/i)).toBeVisible();
		await expect(page.getByRole('link', { name: /view qr codes|lihat qr/i })).toBeVisible();
	});

	test('step progress indicator shows 4 steps', async ({ page }) => {
		const ok = await loginAndGoToOnboarding(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		const steps = page.locator('ol li');
		expect(await steps.count()).toBeGreaterThanOrEqual(4);
	});
});
