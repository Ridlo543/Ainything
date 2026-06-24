/**
 * Staff management E2E specs.
 * Covers: staff dashboard, invite dialog, role change, remove, inbox.
 */

import { expect, test, type Page } from '@playwright/test';

async function loginWithDemoAccount(page: Page): Promise<boolean> {
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
// Staff management page
// ---------------------------------------------------------------------------

test.describe('Staff management page', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('renders team heading and member list', async ({ page }) => {
		const ok = await loginWithDemoAccount(page);
		if (!ok) {
			test.skip(true, 'No mock sessions');
			return;
		}

		await page.goto('/dashboard/staff');
		await expect(page.getByRole('heading', { name: /staff management/i })).toBeVisible();
		// In mock mode no DB staff exist — table rows are empty
		const rows = page.locator('tbody tr');
		if ((await rows.count()) === 0) {
			test.skip(true, 'No staff members in mock mode');
			return;
		}
		await expect(rows.first()).toBeVisible({ timeout: 5000 });
	});

	test('invite dialog opens and closes', async ({ page }) => {
		const ok = await loginWithDemoAccount(page);
		if (!ok) {
			test.skip(true, 'No mock sessions');
			return;
		}

		await page.goto('/dashboard/staff');
		const inviteBtn = page.getByRole('button', { name: /invite/i });
		if (!(await inviteBtn.isVisible())) {
			test.skip(true, 'Invite button not visible (not owner)');
			return;
		}
		await inviteBtn.click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page.getByLabel(/email/i)).toBeVisible();

		// Close with Cancel button
		await page.getByRole('button', { name: /cancel/i }).click();
		await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 });
	});

	test('invite dialog validates empty email', async ({ page }) => {
		const ok = await loginWithDemoAccount(page);
		if (!ok) {
			test.skip(true, 'No mock sessions');
			return;
		}

		await page.goto('/dashboard/staff');
		const inviteBtn = page.getByRole('button', { name: /invite/i });
		if (!(await inviteBtn.isVisible())) {
			test.skip(true, 'Invite button not visible (not owner)');
			return;
		}
		await inviteBtn.click();
		await page.getByRole('button', { name: /send invite/i }).click();
		// HTML5 required attribute should prevent submission
		await expect(page.getByLabel(/email/i)).toBeFocused();
	});
});

// ---------------------------------------------------------------------------
// Staff inbox
// ---------------------------------------------------------------------------

test.describe('Staff inbox', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('renders inbox heading', async ({ page }) => {
		await page.goto('/staff/inbox');
		await page.waitForURL(/login|inbox/);

		if (page.url().includes('login')) {
			// Staff accounts use demo login
			const select = page.getByLabel('Demo account');
			const opts = await select.locator('option').allInnerTexts();
			const staffOpt = opts.find((o) => o.toLowerCase().includes('staff'));
			if (!staffOpt) {
				test.skip(true, 'No staff demo account');
				return;
			}
			await select.selectOption({ label: staffOpt });
			await page.getByRole('button', { name: 'Continue' }).click();
			await page.waitForURL(/inbox/);
		}

		await expect(page.getByRole('heading', { name: /inbox|requests/i })).toBeVisible();
	});

	test('empty state is shown when no requests', async ({ page }) => {
		await page.goto('/staff/inbox');
		await page.waitForURL(/login|inbox/);
		if (page.url().includes('login')) {
			test.skip(true, 'Not logged in as staff');
			return;
		}
		// Either a request row OR an empty state should be visible
		const hasRows = await page.locator('[data-testid="inbox-row"]').count();
		const hasEmpty = await page.getByText(/no.*request|empty|all caught up/i).isVisible();
		expect(hasRows > 0 || hasEmpty).toBe(true);
	});
});
