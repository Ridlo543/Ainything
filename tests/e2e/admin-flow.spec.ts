import { expect, test, type Page } from '@playwright/test';

async function loginWithDemoAccount(page: Page): Promise<boolean> {
	await page.goto('/login');

	const select = page.getByLabel('Demo account');
	const options = await select.locator('option').allInnerTexts();
	const firstOption = options[0]?.trim();

	if (!firstOption) {
		return false;
	}

	await select.selectOption({ label: firstOption });
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.waitForURL(/\/dashboard/);
	return true;
}

test.describe('Login page', () => {
	test('renders sign-in heading and demo account selector', async ({ page }) => {
		await page.goto('/login');

		await expect(
			page.getByRole('heading', { name: 'Sign in to manage restaurants' })
		).toBeVisible();
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

test.describe('Admin flow at 390px', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('login renders correctly at narrow viewport', async ({ page }) => {
		await page.goto('/login');

		await expect(
			page.getByRole('heading', { name: 'Sign in to manage restaurants' })
		).toBeVisible();
		await expect(page.getByLabel('Demo account')).toBeVisible();
	});
});

test.describe('Dashboard overview', () => {
	test('renders heading and stat tiles', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions available');
			return;
		}

		await expect(page.getByRole('heading', { name: 'Restaurant operations' })).toBeVisible();
		await expect(page.getByText('Managed restaurants')).toBeVisible();
		await expect(page.getByText('Scans today')).toBeVisible();
	});

	test('health section and staff queue are visible', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions available');
			return;
		}

		await expect(page.getByRole('heading', { name: 'Restaurant health' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Live staff queue' })).toBeVisible();
	});

	test('navigation links are visible', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions available');
			return;
		}

		await expect(page.getByRole('link', { name: 'Manage QR links' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'View reports' })).toBeVisible();
	});
});

test.describe('Dashboard menu', () => {
	test('renders menu data page with restaurant selector', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions available');
			return;
		}

		await page.goto('/dashboard/menu');

		await expect(page.getByRole('heading', { name: 'Menu data' })).toBeVisible();
		await expect(page.getByLabel('Restaurant')).toBeVisible();
		await expect(page.getByLabel('Publish menu')).toBeVisible();
		await expect(page.getByPlaceholder('Search menu')).toBeVisible();
	});

	test('shows table headers', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions available');
			return;
		}

		await page.goto('/dashboard/menu');

		await expect(page.getByText('Item')).toBeVisible();
		await expect(page.getByText('Category')).toBeVisible();
		await expect(page.getByText('Price')).toBeVisible();
		await expect(page.getByText('Status')).toBeVisible();
	});

	test('can edit a menu item', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}
		await page.goto('/dashboard/menu');

		const editButtons = page.getByLabel('Edit item');
		const count = await editButtons.count();

		if (count === 0) {
			test.skip(true, 'No menu items available to edit');
			return;
		}

		await editButtons.first().click();
		await expect(page.getByRole('heading', { name: 'Edit item' })).toBeVisible();

		const priceInput = page.getByLabel('Price (IDR)');
		await priceInput.fill('45000');
		await page.getByRole('button', { name: 'Save changes' }).click();

		await expect(page.getByRole('heading', { name: 'Edit item' })).not.toBeVisible();
	});

	test('can toggle menu item availability', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}
		await page.goto('/dashboard/menu');

		const toggleButtons = page.getByLabel(/Mark (sold out|available)/);
		const count = await toggleButtons.count();

		if (count === 0) {
			test.skip(true, 'No menu items available to toggle');
			return;
		}

		await toggleButtons.first().click();
		await page.waitForLoadState('networkidle');

		const newButtons = page.getByLabel(/Mark (sold out|available)/);
		await expect(newButtons.first()).toBeVisible();
	});

	test('can open publish menu modal', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}
		await page.goto('/dashboard/menu');

		await page.getByRole('button', { name: 'Publish menu' }).click();
		await expect(page.getByRole('heading', { name: 'Publish menu?' })).toBeVisible();

		await page.getByRole('button', { name: 'Cancel' }).last().click();
		await expect(page.getByRole('heading', { name: 'Publish menu?' })).not.toBeVisible();
	});
});

test.describe('Dashboard knowledge', () => {
	test('renders knowledge page with add button', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions available');
			return;
		}

		await page.goto('/dashboard/knowledge');

		await expect(
			page.getByRole('heading', { name: 'Approved notes for guest answers' })
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Add note' })).toBeVisible();
	});

	test('add note form opens and closes', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}
		await page.goto('/dashboard/knowledge');

		await page.getByRole('button', { name: 'Add note' }).click();
		await expect(page.getByRole('heading', { name: 'Add a knowledge note' })).toBeVisible();

		const cancelButtons = page.getByRole('button', { name: 'Cancel' });
		const visibleCancel = cancelButtons.first();
		await visibleCancel.click();

		await expect(page.getByRole('heading', { name: 'Add a knowledge note' })).not.toBeVisible();
	});

	test('can create a knowledge note', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}
		await page.goto('/dashboard/knowledge');

		await page.getByRole('button', { name: 'Add note' }).click();
		await page.getByLabel('Title').fill('Test Note Title');
		await page.getByLabel('Content').fill('This is test content for the knowledge note.');
		await page.getByRole('button', { name: 'Save' }).click();

		await expect(page.getByText('Test Note Title')).toBeVisible();
	});

	test('can edit a knowledge note', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}
		await page.goto('/dashboard/knowledge');

		const editButtons = page.getByLabel(/edit note/i);
		const firstEdit = editButtons.first();
		const count = await editButtons.count();

		if (count === 0) {
			test.skip(true, 'No knowledge notes available to edit');
			return;
		}

		await firstEdit.click();
		await expect(page.getByRole('heading', { name: 'Edit note' })).toBeVisible();

		const contentField = page.getByLabel('Content');
		await contentField.fill('Updated content for testing');
		await page.getByRole('button', { name: 'Update' }).click();

		await expect(page.getByText('Updated content for testing')).toBeVisible();
	});

	test('can delete a knowledge note', async ({ page }) => {
		const loggedIn = await loginWithDemoAccount(page);
		if (!loggedIn) {
			test.skip(true, 'No mock sessions configured for admin flow test');
			return;
		}
		await page.goto('/dashboard/knowledge');

		const notes = page.locator('article').filter({ hasText: /^(?!Add note)/ });
		const count = await notes.count();

		if (count === 0) {
			test.skip(true, 'No knowledge notes available to delete');
			return;
		}

		const firstNote = notes.first();
		const noteTitle = await firstNote.locator('h2').textContent();

		page.once('dialog', (dialog) => dialog.accept());
		await firstNote.getByLabel(/delete note/i).click();

		if (noteTitle) {
			await expect(page.getByRole('heading', { name: noteTitle })).not.toBeVisible();
		}
	});
});
