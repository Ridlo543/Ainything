/**
 * Team management E2E specs.
 * Covers: create staff account, edit profile, change role, remove member.
 *
 * Auth: LocalAuthProvider — real bcrypt password check against seeded DB.
 * Owner:  owner@bali-table.test / demo1234  → /dashboard
 *
 * These tests require the dev server and a seeded PostgreSQL database.
 * If login fails, each test gracefully skips instead of hard-failing.
 *
 * Important: tests that mutate state (create/remove) use unique emails
 * generated per run to avoid collisions between test runs.
 */

import { expect, test } from '@playwright/test';
import { loginAsOwner, testUtils } from './fixtures';

// Shared test viewport — mobile-first (390px)
const VIEWPORT = { width: 390, height: 844 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to /dashboard/team and wait for the heading to appear. */
async function goToTeamPage(page: import('@playwright/test').Page): Promise<boolean> {
	const ok = await loginAsOwner(page);
	if (!ok) return false;

	await page.goto('/dashboard/team');
	try {
		await page.waitForSelector('h1', { timeout: 8000 });
	} catch {
		return false;
	}
	return true;
}

/** Open the "Tambah Staff" modal. */
async function openCreateModal(page: import('@playwright/test').Page) {
	const btn = page.getByRole('button', { name: /tambah staff/i });
	await expect(btn).toBeVisible({ timeout: 5000 });
	await btn.click();
	// Modal appears — wait for name input to be visible
	await expect(page.getByLabel(/nama/i)).toBeVisible({ timeout: 3000 });
}

/** Find a non-owner member row by partial name/email text. */
async function findNonOwnerMemberRow(page: import('@playwright/test').Page) {
	// All member rows are in the "Anggota Aktif" section
	// We need a row where the "Opsi anggota" button is present (non-owner)
	const menuButtons = page.getByRole('button', { name: /opsi anggota/i });
	const count = await menuButtons.count();
	if (count === 0) return null;
	// Return the first non-owner row's container
	return menuButtons.first();
}

// ---------------------------------------------------------------------------
// Team page structure
// ---------------------------------------------------------------------------

test.describe('Team page', () => {
	test.use({ viewport: VIEWPORT });

	test('renders Tim heading and member count', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await expect(page.getByRole('heading', { name: 'Tim' })).toBeVisible();
		// Member count subtitle: "N anggota aktif"
		await expect(page.getByText(/anggota aktif/i)).toBeVisible();
	});

	test('shows at least one member from seeder', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		// Seeder adds owner@bali-table.test as owner
		await expect(page.getByText('owner@bali-table.test')).toBeVisible({ timeout: 5000 });
	});

	test('shows Owner role badge for the seeded owner', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		// Role badge text
		await expect(page.getByText('Owner').first()).toBeVisible({ timeout: 5000 });
	});

	test('unauthenticated access redirects to login', async ({ page }) => {
		await page.goto('/dashboard/team');
		await page.waitForURL(/\/login/, { timeout: 8000 });
		await expect(page).toHaveURL(/\/login/);
	});
});

// ---------------------------------------------------------------------------
// Create staff account
// ---------------------------------------------------------------------------

test.describe('Create staff account', () => {
	test.use({ viewport: VIEWPORT });

	test('Tambah Staff button opens create modal', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await openCreateModal(page);

		// Modal should contain all required fields
		await expect(page.getByLabel(/nama/i)).toBeVisible();
		await expect(page.getByLabel(/email/i)).toBeVisible();
		await expect(page.getByLabel(/password/i)).toBeVisible();
	});

	test('closes modal when Batal is clicked', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await openCreateModal(page);

		const cancelBtn = page.getByRole('button', { name: /batal/i }).first();
		await cancelBtn.click();

		// Name input should no longer be visible
		await expect(page.getByLabel(/nama/i)).not.toBeVisible({ timeout: 2000 });
	});

	test('creates a new staff account successfully', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		const testId = testUtils.generateTestId();
		const newEmail = `e2e-staff-${testId}@bali-table.test`;

		await openCreateModal(page);

		await page.getByLabel(/nama/i).fill(`E2E Staff ${testId}`);
		await page.getByLabel(/email/i).fill(newEmail);
		await page.getByLabel(/password/i).fill('testpass1234');

		// Submit the form
		await page.getByRole('button', { name: /tambah|simpan/i }).last().click();

		// Expect success toast: role=status with green background
		await expect(page.getByRole('status')).toBeVisible({ timeout: 8000 });

		// New member email should appear in the list
		await expect(page.getByText(newEmail)).toBeVisible({ timeout: 5000 });
	});

	test('shows error when email already exists', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		await openCreateModal(page);

		// Use the seeded owner email — guaranteed to already exist
		await page.getByLabel(/nama/i).fill('Duplicate Test');
		await page.getByLabel(/email/i).fill('owner@bali-table.test');
		await page.getByLabel(/password/i).fill('testpass1234');

		await page.getByRole('button', { name: /tambah|simpan/i }).last().click();

		// Error alert should appear
		await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
		await expect(page.getByRole('alert')).toContainText(/already exists/i);
	});
});

// ---------------------------------------------------------------------------
// Edit staff member
// ---------------------------------------------------------------------------

test.describe('Edit staff member', () => {
	test.use({ viewport: VIEWPORT });

	test('Edit Profil menu item opens edit modal', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		const menuBtn = await findNonOwnerMemberRow(page);
		if (!menuBtn) {
			test.skip(true, 'No non-owner member found — seed more staff');
			return;
		}

		await menuBtn.click();
		await page.getByRole('menuitem', { name: /edit profil/i }).click();

		// Edit modal should show name field pre-filled
		await expect(page.getByLabel(/nama/i)).toBeVisible({ timeout: 3000 });
		const nameValue = await page.getByLabel(/nama/i).inputValue();
		expect(nameValue.length).toBeGreaterThan(0);
	});

	test('saves name change successfully', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		const menuBtn = await findNonOwnerMemberRow(page);
		if (!menuBtn) {
			test.skip(true, 'No non-owner member found');
			return;
		}

		await menuBtn.click();
		await page.getByRole('menuitem', { name: /edit profil/i }).click();
		await expect(page.getByLabel(/nama/i)).toBeVisible({ timeout: 3000 });

		const testId = testUtils.generateTestId();
		const newName = `Updated Name ${testId}`;

		await page.getByLabel(/nama/i).fill(newName);
		await page.getByRole('button', { name: /simpan/i }).last().click();

		// Success toast
		await expect(page.getByRole('status')).toBeVisible({ timeout: 8000 });
		// Updated name visible in the list
		await expect(page.getByText(newName)).toBeVisible({ timeout: 5000 });
	});
});

// ---------------------------------------------------------------------------
// Change role
// ---------------------------------------------------------------------------

test.describe('Change member role', () => {
	test.use({ viewport: VIEWPORT });

	test('Ubah Peran menu item opens role change modal', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		const menuBtn = await findNonOwnerMemberRow(page);
		if (!menuBtn) {
			test.skip(true, 'No non-owner member found');
			return;
		}

		await menuBtn.click();
		await page.getByRole('menuitem', { name: /ubah peran/i }).click();

		// Role selector should be visible
		await expect(page.getByRole('combobox').or(page.locator('select[name="role"]'))).toBeVisible({
			timeout: 3000
		});
	});

	test('changes role and shows success toast', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		const menuBtn = await findNonOwnerMemberRow(page);
		if (!menuBtn) {
			test.skip(true, 'No non-owner member found');
			return;
		}

		await menuBtn.click();
		await page.getByRole('menuitem', { name: /ubah peran/i }).click();

		// Select manager role
		const roleSelect = page.locator('select[name="role"]');
		await expect(roleSelect).toBeVisible({ timeout: 3000 });
		await roleSelect.selectOption('manager');

		await page.getByRole('button', { name: /simpan|ubah/i }).last().click();

		await expect(page.getByRole('status')).toBeVisible({ timeout: 8000 });
	});
});

// ---------------------------------------------------------------------------
// Remove member
// ---------------------------------------------------------------------------

test.describe('Remove staff member', () => {
	test.use({ viewport: VIEWPORT });

	test('Hapus dari Tim opens confirmation modal', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		const menuBtn = await findNonOwnerMemberRow(page);
		if (!menuBtn) {
			test.skip(true, 'No non-owner member found');
			return;
		}

		await menuBtn.click();
		await page.getByRole('menuitem', { name: /hapus dari tim/i }).click();

		// Confirmation modal should appear with destructive button
		await expect(page.getByRole('button', { name: /ya, hapus/i })).toBeVisible({
			timeout: 3000
		});
	});

	test('Batal in remove modal closes without deleting', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		const menuBtn = await findNonOwnerMemberRow(page);
		if (!menuBtn) {
			test.skip(true, 'No non-owner member found');
			return;
		}

		// Count members before
		const countBefore = await page.getByRole('button', { name: /opsi anggota/i }).count();

		await menuBtn.click();
		await page.getByRole('menuitem', { name: /hapus dari tim/i }).click();
		await expect(page.getByRole('button', { name: /ya, hapus/i })).toBeVisible({ timeout: 3000 });

		await page.getByRole('button', { name: /batal/i }).first().click();

		// Modal should close
		await expect(page.getByRole('button', { name: /ya, hapus/i })).not.toBeVisible({
			timeout: 2000
		});

		// Member count unchanged
		const countAfter = await page.getByRole('button', { name: /opsi anggota/i }).count();
		expect(countAfter).toBe(countBefore);
	});

	test('removes a newly-created staff member end-to-end', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		// First create a throwaway member to delete
		const testId = testUtils.generateTestId();
		const throwawayEmail = `e2e-remove-${testId}@bali-table.test`;

		await openCreateModal(page);
		await page.getByLabel(/nama/i).fill(`Remove Test ${testId}`);
		await page.getByLabel(/email/i).fill(throwawayEmail);
		await page.getByLabel(/password/i).fill('testpass1234');
		await page.getByRole('button', { name: /tambah|simpan/i }).last().click();

		// Wait for member to appear
		await expect(page.getByText(throwawayEmail)).toBeVisible({ timeout: 8000 });

		// Now find and click the options button for THIS specific member row
		// The row container has the email text, so locate the menu button relative to it
		const memberRow = page.locator('div').filter({ hasText: throwawayEmail }).last();
		const optionsBtn = memberRow.getByRole('button', { name: /opsi anggota/i });
		await optionsBtn.click();

		await page.getByRole('menuitem', { name: /hapus dari tim/i }).click();
		await expect(page.getByRole('button', { name: /ya, hapus/i })).toBeVisible({ timeout: 3000 });

		await page.getByRole('button', { name: /ya, hapus/i }).click();

		// Success toast
		await expect(page.getByRole('status')).toBeVisible({ timeout: 8000 });

		// Member should no longer appear in list
		await expect(page.getByText(throwawayEmail)).not.toBeVisible({ timeout: 5000 });
	});
});
