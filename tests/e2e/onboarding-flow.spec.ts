/**
 * Onboarding wizard E2E specs.
 * Covers: registration confirm page, setup steps 1–4.
 *
 * Auth: LocalAuthProvider — real bcrypt password check against seeded DB.
 * Owner: owner@bali-table.test / demo1234
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
		await expect(
			page.getByRole('link', { name: /continue.*sign in|sign in|login/i })
		).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Onboarding wizard (requires authenticated owner session)
// ---------------------------------------------------------------------------
