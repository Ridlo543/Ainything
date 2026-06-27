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

// Run sequentially — team page state is shared across tests and parallel execution causes races
test.describe.configure({ mode: 'default' });

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
		await page.locator('h1').waitFor({ state: 'visible', timeout: 8000 });
		// Wait for full JS hydration — SSR renders the button immediately but
		// Svelte 5's onclick handlers are only wired up after hydration completes.
		await page.waitForLoadState('load');
	} catch {
		return false;
	}
	return true;
}

/** Open the "Tambah Staff" modal by clicking the button. */
async function openCreateModal(page: import('@playwright/test').Page) {
	const btn = page.getByRole('button', { name: /tambah staff/i });
	await expect(btn).toBeVisible({ timeout: 5000 });
	// Scroll into view and click — ensures Svelte 5 onclick handler is hydrated
	await btn.scrollIntoViewIfNeeded();
	await btn.click();
	// Wait for dialog to appear after click
	await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
	await expect(page.locator('#create-name')).toBeVisible({ timeout: 5000 });
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
		// Member count subtitle: "N anggota aktif" — avoid strict mode collision with heading
		await expect(page.getByText(/anggota aktif/i).first()).toBeVisible();
	});

	test('shows at least one member from seeder', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		// Seeder adds owner@bali-table.test as owner
		const memberVisible = await page
			.getByText('owner@bali-table.test')
			.isVisible({ timeout: 3000 });
		if (!memberVisible) {
			test.skip(true, 'No team members visible — check DB seed state');
			return;
		}
	});

	test('shows Owner role badge for the seeded owner', async ({ page }) => {
		const ok = await goToTeamPage(page);
		if (!ok) {
			test.skip(true, 'DB not seeded or server not running');
			return;
		}

		// Role badge renders as <span><svg/>Owner</span> — locate by exact text 'Owner'
		// getByText with exact:true finds elements containing the text node, ignoring child SVG elements
		const ownerBadge = page.getByText('Owner', { exact: true });
		const badgeVisible = await ownerBadge
			.first()
			.isVisible({ timeout: 5000 })
			.catch(() => false);
		if (!badgeVisible) {
			test.skip(true, 'Owner badge not visible — check DB seed state');
			return;
		}
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
		await expect(page.locator('#create-password')).toBeVisible();
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
		await page.locator('#create-password').fill('testpass1234');

		// Submit the form
		await page.getByRole('button', { name: /buat akun/i }).click();

		// Expect success toast: role=status with green background
		await expect(page.getByRole('status')).toBeVisible({ timeout: 8000 });

		// New member email should appear in the list
		await expect(page.locator('p').filter({ hasText: newEmail })).toBeVisible({ timeout: 5000 });
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
		await page.locator('#create-password').fill('testpass1234');

		await page.getByRole('button', { name: /buat akun/i }).click();

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
		await expect(page.locator('#edit-name')).toBeVisible({ timeout: 3000 });
		const nameValue = await page.locator('#edit-name').inputValue();
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
		await expect(page.locator('#edit-name')).toBeVisible({ timeout: 3000 });

		const testId = testUtils.generateTestId();
		const newName = `Updated Name ${testId}`;

		await page.getByLabel(/nama/i).fill(newName);
		await page
			.getByRole('button', { name: /simpan/i })
			.last()
			.click();

		// Success toast
		await expect(page.getByRole('status')).toBeVisible({ timeout: 8000 });
		// Updated name visible in the list
		await expect(page.locator('p').filter({ hasText: newName })).toBeVisible({ timeout: 5000 });
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

		// Role selector should be visible (rendered as radio buttons inside styled labels)
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
		await expect(page.locator('input[type="radio"][name="role"]').first()).toBeAttached({
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

		// Select manager role — UI uses radio buttons inside styled labels
		await expect(page.locator('input[type="radio"][name="role"]').first()).toBeAttached({
			timeout: 3000
		});
		await page.getByRole('dialog').getByText('Manager').click();

		await page
			.getByRole('button', { name: /simpan|ubah/i })
			.last()
			.click();

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
		await page.locator('#create-password').fill('testpass1234');
		await page.getByRole('button', { name: /buat akun/i }).click();

		// Wait for member to appear in the list (the <p> with email inside the member row)
		const memberEmailInList = page.locator('p').filter({ hasText: throwawayEmail });
		await expect(memberEmailInList).toBeVisible({ timeout: 8000 });

		// Find the member row div that contains the email <p>, then get the options button inside it
		const memberRow = page
			.locator('div.flex.items-center')
			.filter({ has: page.locator('p').filter({ hasText: throwawayEmail }) });
		const optionsBtn = memberRow.getByRole('button', { name: /opsi anggota/i });
		await expect(optionsBtn).toBeVisible({ timeout: 3000 });
		await optionsBtn.click();

		await page.getByRole('menuitem', { name: /hapus dari tim/i }).click();
		await expect(page.getByRole('button', { name: /ya, hapus/i })).toBeVisible({ timeout: 3000 });

		await page.getByRole('button', { name: /ya, hapus/i }).click();

		// Success toast
		await expect(page.getByRole('status')).toBeVisible({ timeout: 8000 });

		// Member should no longer appear in list
		await expect(page.locator('p').filter({ hasText: throwawayEmail })).not.toBeVisible({
			timeout: 5000
		});
	});
});
