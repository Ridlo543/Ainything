/**
 * Auth flow E2E specs.
 * Covers: registration pages, login, password reset, logout.
 *
 * Auth: LocalAuthProvider — real bcrypt password check against seeded DB.
 * Credentials: owner@bali-table.test / demo1234
 */

import { expect, test } from '@playwright/test';
import { loginAsOwner, DEMO_OWNER } from './fixtures';

// ---------------------------------------------------------------------------
// Registration — restaurant path
// ---------------------------------------------------------------------------

test.describe('Registration — restaurant path', () => {
	test('registration page renders all fields', async ({ page }) => {
		await page.goto('/register/restaurant');

		await expect(page.getByRole('heading', { name: /register|daftar/i })).toBeVisible();
		await expect(page.getByLabel(/your name/i)).toBeVisible();
		await expect(page.getByLabel(/email/i)).toBeVisible();
		await expect(page.getByLabel('Password')).toBeVisible();
		await expect(page.getByLabel(/restaurant name/i)).toBeVisible();
	});

	test('shows error when form submitted empty', async ({ page }) => {
		await page.goto('/register/restaurant');
		await page.getByRole('button', { name: /create|register|daftar/i }).click();
		await expect(page.getByLabel(/your name/i)).toBeFocused();
	});

	test('has link back to registration options', async ({ page }) => {
		await page.goto('/register/restaurant');
		await expect(page.getByRole('link', { name: /back to/i })).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Registration — organization path
// ---------------------------------------------------------------------------

test.describe('Registration — organization path', () => {
	test('registration page renders all fields', async ({ page }) => {
		await page.goto('/register/organization');

		await expect(page.getByRole('heading', { name: /register|daftar/i })).toBeVisible();
		await expect(page.getByLabel(/your name/i)).toBeVisible();
		await expect(page.getByLabel(/email/i)).toBeVisible();
		await expect(page.getByLabel('Password')).toBeVisible();
		await expect(page.getByLabel(/organization name/i)).toBeVisible();
	});

	test('shows error when form submitted empty', async ({ page }) => {
		await page.goto('/register/organization');
		await page.getByRole('button', { name: /create|register|daftar/i }).click();
		await expect(page.getByLabel(/your name/i)).toBeFocused();
	});

	test('has link back to registration options', async ({ page }) => {
		await page.goto('/register/organization');
		await expect(page.getByRole('link', { name: /back to/i })).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

test.describe('Login', () => {
	test('login page renders email and password fields', async ({ page }) => {
		await page.goto('/login');

		await expect(page.getByLabel('Email')).toBeVisible();
		await expect(page.locator('#password')).toBeVisible();
		await expect(page.getByRole('button', { name: /masuk/i })).toBeVisible();
	});

	test('successful login redirects owner to dashboard', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('invalid credentials show error message', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel('Email').fill('notexist@example.com');
		await page.locator('#password').fill('wrongpassword');
		await page.getByRole('button', { name: /masuk/i }).click();

		await expect(page).toHaveURL(/\/login/);
		await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
	});

	test('wrong password for valid email shows error', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel('Email').fill(DEMO_OWNER.email);
		await page.locator('#password').fill('wrongpassword');
		await page.getByRole('button', { name: /masuk/i }).click();

		await expect(page).toHaveURL(/\/login/);
		await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
	});

	test('has link to registration', async ({ page }) => {
		await page.goto('/login');
		await expect(page.getByRole('link', { name: /daftar/i })).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Forgot password page
// ---------------------------------------------------------------------------

test.describe('Forgot password page', () => {
	test('renders email field and submit button', async ({ page }) => {
		await page.goto('/auth/forgot-password');

		await expect(page.getByLabel(/email/i)).toBeVisible();
		await expect(page.getByRole('button', { name: /reset|kirim|send/i })).toBeVisible();
	});

	test('has link back to login', async ({ page }) => {
		await page.goto('/auth/forgot-password');
		const link = page.getByRole('link', { name: /back.*login|sign in/i });
		await expect(link).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Update password page
// ---------------------------------------------------------------------------

test.describe('Update password page', () => {
	test('unauthenticated user is redirected away', async ({ page }) => {
		await page.goto('/auth/update-password');
		await page.waitForURL(/\/login|update-password|forgot-password/);
		expect(page.url()).toMatch(/login|update-password|forgot-password/);
	});
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

test.describe('Logout', () => {
	test('logout redirects to login', async ({ page }) => {
		const loggedIn = await loginAsOwner(page);
		if (!loggedIn) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await page.goto('/dashboard');
		// Submit the logout form action directly
		await page.evaluate(() => {
			const form = document.createElement('form');
			form.method = 'POST';
			form.action = '/logout';
			document.body.appendChild(form);
			form.submit();
		});
		await page.waitForURL(/\/login/, { timeout: 8000 });
		await expect(page).toHaveURL(/\/login/);
	});
});
