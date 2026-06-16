import { expect, test } from '@playwright/test';

test('customer QR flow renders menu, chat, and feedback states', async ({ page }) => {
	await page.goto('/r/uma-karang/table/T07');

	await expect(page.getByRole('heading', { name: 'Uma Karang' })).toBeVisible();
	await expect(page.getByText('Language and food preferences')).toBeVisible();
	await expect(page.getByText('Browse menu')).toBeVisible();
	await expect(page.getByText('Ask about the menu')).toBeVisible();

	await page.getByRole('button', { name: 'Ask staff' }).click();
	await expect(page.getByText('Staff request prepared for T07')).toBeVisible();

	await page.getByRole('button', { name: 'Helpful' }).click();
	await expect(page.getByText('Feedback captured locally.')).toBeVisible();
});

test('admin dashboard renders mocked phase 5 surfaces', async ({ page }) => {
	await page.goto('/dashboard');

	await expect(page.getByRole('heading', { name: 'Restaurant operations' })).toBeVisible();
	await expect(page.getByText('Restaurant health')).toBeVisible();

	await page.getByRole('link', { name: 'Menu data' }).click();
	await expect(page.getByRole('heading', { name: 'Menu data' })).toBeVisible();

	await page.getByRole('link', { name: 'Menu review' }).click();
	await expect(page.getByRole('heading', { name: '10 restaurant source menus' })).toBeVisible();
});

test('staff inbox renders selected fallback detail', async ({ page }) => {
	await page.goto('/staff/inbox');

	await expect(page.getByRole('heading', { name: 'Help requests' })).toBeVisible();
	await expect(page.getByText('Guest summary for staff')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Open guest view' })).toBeVisible();
});
