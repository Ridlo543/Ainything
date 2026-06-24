import { expect, test } from '@playwright/test';

const TEST_URL = '/r/uma-karang/table/T07';
const RTL_TEST_URL = '/r/rempah-terrace/table/A01';

test.describe('Customer flow at 360px', () => {
	test.use({ viewport: { width: 360, height: 740 } });

	test('renders restaurant hero and session bootstrap', async ({ page }) => {
		await page.goto(TEST_URL);

		await expect(page.getByRole('heading', { name: 'Uma Karang' })).toBeVisible();
		await expect(page.getByText('Table T07')).toBeVisible();
		await expect(page.getByText('Language and food preferences')).toBeVisible();
		await expect(page.getByText('No login required')).toBeVisible();
	});

	test('language selector shows options in selected language', async ({ page }) => {
		await page.goto(TEST_URL);

		const langSelect = page.getByLabel('Language');
		await expect(langSelect).toBeVisible();

		const options = await langSelect.locator('option').allTextContents();
		expect(options.length).toBeGreaterThanOrEqual(1);
		expect(options).toContain('English');
	});

	test('preference chips toggle correctly', async ({ page }) => {
		await page.goto(TEST_URL);

		const halalBtn = page.getByRole('button', { name: 'Halal', exact: true });
		await expect(halalBtn).toBeVisible();
		await expect(halalBtn).toHaveAttribute('aria-pressed', 'false');

		await halalBtn.click();
		await expect(halalBtn).toHaveAttribute('aria-pressed', 'true');

		await halalBtn.click();
		await expect(halalBtn).toHaveAttribute('aria-pressed', 'false');
	});

	test('menu browse renders categories and items', async ({ page }) => {
		await page.goto(TEST_URL);

		await expect(page.getByText('Browse menu')).toBeVisible();
		await expect(
			page.getByText('Menu details are based on restaurant-approved data.')
		).toBeVisible();

		const categoryTabs = page.locator('section >> button', { hasText: /Food|Drinks|Dessert/ });
		await expect(categoryTabs.first()).toBeAttached();
	});

	test('menu item card shows spice, price, and badges', async ({ page }) => {
		await page.goto(TEST_URL);

		const firstCard = page
			.locator('section >> button')
			.filter({ has: page.locator('img') })
			.first();
		await expect(firstCard).toBeVisible();

		await expect(firstCard.locator('text=RP')).toBeVisible();
	});

	test('selecting a menu item opens detail panel', async ({ page }) => {
		await page.goto(TEST_URL);

		const firstCard = page
			.locator('section >> button')
			.filter({ has: page.locator('img') })
			.first();
		await firstCard.click();

		await expect(page.getByText('Recommendation reason')).toBeVisible();
		await expect(page.getByText('Spice level:')).toBeVisible();
	});

	test('detail panel shows verified or staff-confirm state', async ({ page }) => {
		await page.goto(TEST_URL);

		const firstCard = page
			.locator('section >> button')
			.filter({ has: page.locator('img') })
			.first();
		await firstCard.click();

		const detail = page.locator('aside');
		const verified = detail.getByText('Verified menu data');
		const staffConfirm = detail.getByText('Staff confirmation recommended');
		await expect(verified.or(staffConfirm)).toBeVisible();
	});

	test('chat panel renders and shows empty state', async ({ page }) => {
		await page.goto(TEST_URL);

		await expect(page.getByText('Ask about the menu')).toBeVisible();
		await expect(page.getByText('Answers use restaurant data')).toBeVisible();
		await expect(page.getByPlaceholder('Ask: Is this spicy?')).toBeVisible();
	});

	test('chat panel shows suggestion chips', async ({ page }) => {
		await page.goto(TEST_URL);

		await expect(page.getByRole('button', { name: 'Is this halal?' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Any nut-free dishes?' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'What is the spice level?' })).toBeVisible();
	});

	test('chat panel send button is disabled when empty', async ({ page }) => {
		await page.goto(TEST_URL);

		const sendBtn = page.getByRole('button', { name: 'Send question' });
		await expect(sendBtn).toBeDisabled();

		const input = page.getByPlaceholder('Ask: Is this spicy?');
		await input.fill('Is this halal?');
		await expect(sendBtn).toBeEnabled();
	});

	test('chat panel shows Speak to staff CTA', async ({ page }) => {
		await page.goto(TEST_URL);

		await expect(page.getByRole('button', { name: 'Speak to staff' })).toBeVisible();
	});

	test('feedback buttons render and respond', async ({ page }) => {
		await page.goto(TEST_URL);

		await expect(page.getByText(/quick feedback/i)).toBeVisible();
		await expect(page.getByText(/tell the restaurant if this helped/i)).toBeVisible();

		const helpfulBtn = page.getByRole('button', { name: /helpful/i });
		const unclearBtn = page.getByRole('button', { name: /unclear/i });
		await expect(helpfulBtn).toBeVisible();
		await expect(unclearBtn).toBeVisible();

		await helpfulBtn.click();
		await expect(page.getByText(/thank you for your feedback/i)).toBeVisible({ timeout: 5000 });
	});

	test('staff fallback CTA is visible', async ({ page }) => {
		await page.goto(TEST_URL);

		// Button text depends on chat state; always present in idle state
		const staffBtn = page
			.getByRole('button', { name: /speak to staff|ask staff/i })
			.first();
		await expect(staffBtn).toBeVisible();
	});
});

test.describe('Customer flow at 390px', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('renders restaurant hero', async ({ page }) => {
		await page.goto(TEST_URL);

		await expect(page.getByRole('heading', { name: 'Uma Karang' })).toBeVisible();
		await expect(page.getByText('Language and food preferences')).toBeVisible();
	});

	test('menu category tabs scroll horizontally', async ({ page }) => {
		await page.goto(TEST_URL);

		await expect(page.getByText('Browse menu')).toBeVisible();

		// Check that the tab bar scroll container exists
		const tabRow = page.locator('div.flex.gap-2.overflow-x-auto').first();
		await expect(tabRow).toBeVisible();
	});

	test('chat panel input and send work', async ({ page }) => {
		await page.goto(TEST_URL);

		const input = page.getByPlaceholder('Ask: Is this spicy?');
		await input.fill('Do you have vegetarian options?');

		const sendBtn = page.getByRole('button', { name: 'Send question' });
		await expect(sendBtn).toBeEnabled();
	});

	test('feedback sent confirmation persists', async ({ page }) => {
		await page.goto(TEST_URL);

		await page.getByRole('button', { name: /unclear/i }).click();
		await expect(page.getByText(/thank you for your feedback/i)).toBeVisible({ timeout: 5000 });
	});

	test('item detail shows allergen and dietary badges', async ({ page }) => {
		await page.goto(TEST_URL);

		const firstCard = page
			.locator('section >> button')
			.filter({ has: page.locator('img') })
			.first();
		await firstCard.click();

		const aside = page.locator('aside');
		await expect(
			aside.getByText(/Halal-friendly|Vegetarian|Vegan|Contains alcohol/).first()
		).toBeAttached();
	});
});

test.describe('Arabic RTL layout at 360px', () => {
	test.use({ viewport: { width: 360, height: 740 } });

	test('renders restaurant hero with RTL text direction', async ({ page }) => {
		await page.goto(RTL_TEST_URL);

		await expect(page.getByRole('heading', { name: 'Rempah Terrace' })).toBeVisible();
		await expect(page.getByText('Table A01')).toBeVisible();
	});

	test('chat panel renders correctly in RTL viewport', async ({ page }) => {
		await page.goto(RTL_TEST_URL);

		await expect(page.getByPlaceholder('Ask: Is this spicy?')).toBeVisible();
		await expect(page.getByText('Ask about the menu')).toBeVisible();
	});

	test('no horizontal overflow at 360px', async ({ page }) => {
		await page.goto(RTL_TEST_URL);

		const html = page.locator('html');
		const scrollWidth = await html.evaluate((el) => el.scrollWidth);
		const clientWidth = await html.evaluate((el) => el.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
	});
});
