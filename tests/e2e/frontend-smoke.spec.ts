import { expect, test } from '@playwright/test';

test('customer QR flow renders menu, chat, and feedback states', async ({ page }) => {
	await page.goto('/r/uma-karang/table/T07');

	await expect(page.getByRole('heading', { name: 'Uma Karang' })).toBeVisible();
	await expect(page.getByText('Language and food preferences')).toBeVisible();
	await expect(page.getByText('Browse menu')).toBeVisible();
	await expect(page.getByText('Ask about the menu')).toBeVisible();

	// Staff fallback button (may say 'Speak to staff' or 'Ask staff directly')
	const staffBtn = page.getByRole('button', { name: /speak to staff|ask staff/i }).first();
	await expect(staffBtn).toBeVisible();

	await page.getByRole('button', { name: /helpful/i }).click();
	await expect(page.getByText(/thank you for your feedback/i)).toBeVisible();
});

test('admin dashboard renders mocked phase 5 surfaces', async ({ page }) => {
	await page.goto('/dashboard');

	await expect(page).toHaveURL(/\/login/);
	// In mock mode the login form shows a demo account selector + Continue button
	await page.getByLabel('Demo account').selectOption({ index: 0 });
	await page.getByRole('button', { name: /continue/i }).click();
	await expect(page).toHaveURL(/\/dashboard/);
	await expect(page.getByRole('heading', { name: /restaurant operations/i })).toBeVisible();
	await expect(page.getByText(/restaurant health/i)).toBeVisible();

	await page.getByRole('link', { name: /menu data/i }).click();
	await expect(page.getByRole('heading', { name: /menu data/i })).toBeVisible();

	await page.getByRole('link', { name: /menu review/i }).click();
	await expect(page.getByRole('heading', { name: /ocr menu extraction/i })).toBeVisible();
});

test('staff inbox renders empty state with heading', async ({ page }) => {
	await page.goto('/staff/inbox');

	await expect(page).toHaveURL(/\/login/);
	await page.getByLabel('Demo account').selectOption({ index: 1 });
	await page.getByRole('button', { name: /continue/i }).click();
	await expect(page).toHaveURL(/\/staff\/inbox/);
	await expect(page.getByRole('heading', { name: /help requests/i })).toBeVisible();
	await expect(page.getByText(/all clear|no requests/i)).toBeVisible();
});
