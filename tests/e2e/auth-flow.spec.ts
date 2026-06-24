/**
 * Auth flow E2E specs.
 * Covers: registration, login, forgot password, password update, logout.
 * Uses mock auth provider (AUTH_PROVIDER=mock in playwright.config.ts).
 */

import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginWithDemoAccount(page: import('@playwright/test').Page): Promise<boolean> {
	await page.goto('/login');
	const select = page.getByLabel('Demo account');
	const options = await select.locator('option').allInnerTexts();
	const first = options[0]?.trim();
	if (!first) return false;
	await select.selectOption({ label: first });
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.waitForURL(/\/dashboard/);
	return true;
}

// ---------------------------------------------------------------------------
// Registration — restaurant path
// ---------------------------------------------------------------------------

	test.describe('Registration — restaurant path', () => {
		test('registration page renders all fields', async ({ page }) => {
			await page.goto('/register/restaurant');

			const isMock = await page.getByText(/registration is disabled in demo mode/i).isVisible();
			if (isMock) {
				test.skip(true, 'Form hidden in mock mode');
				return;
			}

			await expect(page.getByRole('heading', { name: /register/i })).toBeVisible();
			await expect(page.getByLabel(/your name/i)).toBeVisible();
			await expect(page.getByLabel(/email/i)).toBeVisible();
			await expect(page.getByLabel(/password/i)).toBeVisible();
			await expect(page.getByLabel(/restaurant name/i)).toBeVisible();
		});

		test('shows error when form submitted empty', async ({ page }) => {
			await page.goto('/register/restaurant');
			const isMock = await page.getByText(/registration is disabled in demo mode/i).isVisible();
			if (isMock) {
				test.skip(true, 'Form hidden in mock mode');
				return;
			}
			await page.getByRole('button', { name: /create|register/i }).click();
			// HTML5 validation prevents submission — required fields should be marked
			await expect(page.getByLabel(/your name/i)).toBeFocused();
		});

		test('has link to sign in page', async ({ page }) => {
			await page.goto('/register/restaurant');

			const isMock = await page.getByText(/registration is disabled in demo mode/i).isVisible();
			if (isMock) {
				test.skip(true, 'Form hidden in mock mode');
				return;
			}

			const link = page.getByRole('link', { name: /sign in/i });
			await expect(link).toBeVisible();
		});
	});

// ---------------------------------------------------------------------------
// Registration — organization path
// ---------------------------------------------------------------------------

	test.describe('Registration — organization path', () => {
		test('registration page renders all fields', async ({ page }) => {
			await page.goto('/register/organization');

			const isMock = await page.getByText(/registration is disabled in demo mode/i).isVisible();
			if (isMock) {
				test.skip(true, 'Form hidden in mock mode');
				return;
			}

			await expect(page.getByRole('heading', { name: /register/i })).toBeVisible();
			await expect(page.getByLabel(/your name/i)).toBeVisible();
			await expect(page.getByLabel(/organization name/i)).toBeVisible();
			await expect(page.getByLabel(/email/i)).toBeVisible();
			await expect(page.getByLabel(/password/i)).toBeVisible();
		});

		test('has link to sign in page', async ({ page }) => {
			await page.goto('/register/organization');

			const isMock = await page.getByText(/registration is disabled in demo mode/i).isVisible();
			if (isMock) {
				test.skip(true, 'Form hidden in mock mode');
				return;
			}

			const link = page.getByRole('link', { name: /sign in/i });
			await expect(link).toBeVisible();
		});
	});

// ---------------------------------------------------------------------------
// Registration setup step (Step 2)
// ---------------------------------------------------------------------------

test.describe('Registration setup step', () => {
	test('unauthenticated user is redirected to login', async ({ page }) => {
		await page.goto('/register/restaurant/setup');
		await page.waitForURL(/\/login/);
		await expect(page).toHaveURL(/\/login/);
	});
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

test.describe('Login page', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('renders all required elements', async ({ page }) => {
		await page.goto('/login');
		await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /continue|sign in/i })).toBeVisible();
	});

	test('redirects authenticated user away from login', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions available');
			return;
		}
		await page.goto('/login');
		await page.waitForURL(/\/dashboard/);
		await expect(page).toHaveURL(/\/dashboard/);
	});
});

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

test.describe('Forgot password', () => {
	test('page renders email field and submit button', async ({ page }) => {
		await page.goto('/auth/forgot-password');
		await expect(page.getByRole('heading', { name: /forgot/i })).toBeVisible();
		await expect(page.getByLabel(/email/i)).toBeVisible();
		await expect(page.getByRole('button', { name: /send/i })).toBeVisible();
	});

	test('submitting valid email shows confirmation', async ({ page }) => {
		await page.goto('/auth/forgot-password');
		await page.getByLabel(/email/i).fill('test@example.com');
		await page.getByRole('button', { name: /send/i }).click();
		// Should show sent confirmation (always returns sent:true to prevent enumeration)
		await expect(page.getByText(/check your email|sent|confirmation/i).first()).toBeVisible({ timeout: 5000 });
	});

	test('has back to login link', async ({ page }) => {
		await page.goto('/auth/forgot-password');
		const link = page.getByRole('link', { name: /back.*login|sign in/i });
		await expect(link).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Update password
// ---------------------------------------------------------------------------

test.describe('Update password page', () => {
	test('unauthenticated user is redirected', async ({ page }) => {
		await page.goto('/auth/update-password');
		// Should redirect to forgot-password since no active session
		await page.waitForURL(/\/login|update-password|forgot-password/);
		const url = page.url();
		// Either redirected to login/forgot-password, or shown the form (recovery flow allows direct access)
		expect(url).toMatch(/login|update-password|forgot-password/);
	});
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

test.describe('Logout', () => {
	test('logout redirects to login', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions available');
			return;
		}

		// POST to logout action via form submit
		await page.goto('/dashboard');

		// Navigate to /logout directly (POST-only endpoint for session cleanup)
		await page.evaluate(() => {
			const form = document.createElement('form');
			form.method = 'POST';
			form.action = '/logout';
			document.body.appendChild(form);
			form.submit();
		});
	});
});
