import { expect, test } from '@playwright/test';

test.describe('Login page', () => {
	test('renders sign-in heading and demo account selector', async ({ page }) => {
		await page.goto('/login');

		await expect(page.getByRole('heading', { name: 'Sign in to manage restaurants' })).toBeVisible();
		await expect(page.getByLabel('Demo account')).toBeVisible();
	});

	test('demo account selector has options', async ({ page }) => {
		await page.goto('/login');

		const select = page.getByLabel('Demo account');
		const options = await select.locator('option').allTextContents();
		expect(options.length).toBeGreaterThanOrEqual(1);
	});

	test('continue button is visible', async ({ page }) => {
		await page.goto('/login');

		await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
	});
});

test.describe('Dashboard overview', () => {
	test('renders heading and stat tiles', async ({ page }) => {
		await page.goto('/login');

		const select = page.getByLabel('Demo account');
		const options = await select.locator('option').allInnerTexts();
		const firstOption = options[0]?.trim();

		if (!firstOption) {
			// No mock sessions available — skip dashboard tests.
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}

		await select.selectOption({ label: firstOption });
		await page.getByRole('button', { name: 'Continue' }).click();

		await page.waitForURL(/\/dashboard/);

		await expect(page.getByRole('heading', { name: 'Restaurant operations' })).toBeVisible();
		await expect(page.getByText('Managed restaurants')).toBeVisible();
		await expect(page.getByText('Scans today')).toBeVisible();
	});

	test('health section and staff queue are visible', async ({ page }) => {
		await page.goto('/login');

		const select = page.getByLabel('Demo account');
		const options = await select.locator('option').allInnerTexts();

		if (!options.length || !options[0]?.trim()) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}

		await select.selectOption({ label: options[0].trim() });
		await page.getByRole('button', { name: 'Continue' }).click();
		await page.waitForURL(/\/dashboard/);

		await expect(page.getByRole('heading', { name: 'Restaurant health' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Live staff queue' })).toBeVisible();
	});

	test('navigation links are visible', async ({ page }) => {
		await page.goto('/login');

		const select = page.getByLabel('Demo account');
		const options = await select.locator('option').allInnerTexts();

		if (!options.length || !options[0]?.trim()) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}

		await select.selectOption({ label: options[0].trim() });
		await page.getByRole('button', { name: 'Continue' }).click();
		await page.waitForURL(/\/dashboard/);

		await expect(page.getByRole('link', { name: 'Manage QR links' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'View reports' })).toBeVisible();
	});
});

test.describe('Dashboard menu', () => {
	test('renders menu data page with restaurant selector', async ({ page }) => {
		await page.goto('/login');

		const select = page.getByLabel('Demo account');
		const options = await select.locator('option').allInnerTexts();

		if (!options.length || !options[0]?.trim()) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}

		await select.selectOption({ label: options[0].trim() });
		await page.getByRole('button', { name: 'Continue' }).click();
		await page.waitForURL(/\/dashboard/);

		await page.goto('/dashboard/menu');

		await expect(page.getByRole('heading', { name: 'Menu data' })).toBeVisible();
		await expect(page.getByLabel('Restaurant')).toBeVisible();
		await expect(page.getByLabel('Publish menu')).toBeVisible();
		await expect(page.getByPlaceholder('Search menu')).toBeVisible();
	});

	test('shows table headers', async ({ page }) => {
		await page.goto('/login');

		const select = page.getByLabel('Demo account');
		const options = await select.locator('option').allInnerTexts();

		if (!options.length || !options[0]?.trim()) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}

		await select.selectOption({ label: options[0].trim() });
		await page.getByRole('button', { name: 'Continue' }).click();
		await page.waitForURL(/\/dashboard/);
		await page.goto('/dashboard/menu');

		await expect(page.getByText('Item')).toBeVisible();
		await expect(page.getByText('Category')).toBeVisible();
		await expect(page.getByText('Price')).toBeVisible();
		await expect(page.getByText('Status')).toBeVisible();
	});
});

test.describe('Dashboard knowledge', () => {
	test('renders knowledge page with add button', async ({ page }) => {
		await page.goto('/login');

		const select = page.getByLabel('Demo account');
		const options = await select.locator('option').allInnerTexts();

		if (!options.length || !options[0]?.trim()) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}

		await select.selectOption({ label: options[0].trim() });
		await page.getByRole('button', { name: 'Continue' }).click();
		await page.waitForURL(/\/dashboard/);
		await page.goto('/dashboard/knowledge');

		await expect(
			page.getByRole('heading', { name: 'Approved notes for guest answers' })
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Add note' })).toBeVisible();
	});

	test('add note form opens and closes', async ({ page }) => {
		await page.goto('/login');

		const select = page.getByLabel('Demo account');
		const options = await select.locator('option').allInnerTexts();

		if (!options.length || !options[0]?.trim()) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}

		await select.selectOption({ label: options[0].trim() });
		await page.getByRole('button', { name: 'Continue' }).click();
		await page.waitForURL(/\/dashboard/);
		await page.goto('/dashboard/knowledge');

		await page.getByRole('button', { name: 'Add note' }).click();
		await expect(page.getByRole('heading', { name: 'Add a knowledge note' })).toBeVisible();

		const cancelButtons = page.getByRole('button', { name: 'Cancel' });
		const visibleCancel = cancelButtons.first();
		await visibleCancel.click();

		await expect(
			page.getByRole('heading', { name: 'Add a knowledge note' })
		).not.toBeVisible();
	});
});