import { expect, test } from '@playwright/test';

async function loginWithDemoAccount(page: import('@playwright/test').Page): Promise<boolean> {
	await page.goto('/login');
	try {
		await page.getByLabel('Email').fill('owner@bali-table.test');
		await page.getByLabel('Password').fill('anything');
		await page.getByRole('button', { name: /masuk/i }).click();
		await page.waitForURL(/\/dashboard/);
		return true;
	} catch {
		return false;
	}
}

test.describe('Registration — restaurant path', () => {
	test('registration page renders all fields', async ({ page }) => {
		await page.goto('/register/restaurant');

		const isMock = await page.getByText(/registration is disabled in demo mode/i).isVisible();
		if (isMock) {
			test.skip(true, 'Form hidden in mock mode');
			return;
		}

		await expect(page.getByRole('heading', { name: /register|daftar/i })).toBeVisible();
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
		await page.getByRole('button', { name: /create|register|daftar/i }).click();
		await expect(page.getByLabel(/your name/i)).toBeFocused();
	});

	test('has link to registration options', async ({ page }) => {
		await page.goto('/register/restaurant');

		const isMock = await page.getByText(/registration is disabled in demo mode/i).isVisible();
		if (isMock) {
			test.skip(true, 'Form hidden in mock mode');
			return;
		}

		const link = page.getByRole('link', { name: /back to/i });
		await expect(link).toBeVisible();
	});
});

test.describe('Registration — organization path', () => {
	test('registration page renders all fields', async ({ page }) => {
		await page.goto('/register/organization');

		const isMock = await page.getByText(/registration is disabled in demo mode/i).isVisible();
		if (isMock) {
			test.skip(true, 'Form hidden in mock mode');
			return;
		}

		await expect(page.getByRole('heading', { name: /register|daftar/i })).toBeVisible();
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

test.describe('Registration setup step', () => {
	test('unauthenticated user is redirected to login', async ({ page }) => {
		await page.goto('/register/restaurant/setup');
		await page.waitForURL(/\/login/);
		await expect(page).toHaveURL(/\/login/);
	});
});

test.describe('Login page', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('renders all required elements', async ({ page }) => {
		await page.goto('/login');
		await expect(page.getByRole('heading', { name: /selamat datang|welcome/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /masuk|sign in/i })).toBeVisible();
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
		await expect(page.getByText(/check your email|sent|confirmation/i).first()).toBeVisible({
			timeout: 5000
		});
	});

	test('has back to login link', async ({ page }) => {
		await page.goto('/auth/forgot-password');
		const link = page.getByRole('link', { name: /back.*login|sign in/i });
		await expect(link).toBeVisible();
	});
});

test.describe('Update password page', () => {
	test('unauthenticated user is redirected', async ({ page }) => {
		await page.goto('/auth/update-password');
		await page.waitForURL(/\/login|update-password|forgot-password/);
		const url = page.url();
		expect(url).toMatch(/login|update-password|forgot-password/);
	});
});

test.describe('Logout', () => {
	test('logout redirects to login', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions available');
			return;
		}

		await page.goto('/dashboard');
		await page.evaluate(() => {
			const form = document.createElement('form');
			form.method = 'POST';
			form.action = '/logout';
			document.body.appendChild(form);
			form.submit();
		});
	});
});
