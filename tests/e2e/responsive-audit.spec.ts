/**
 * Responsive audit E2E specs.
 * Tests horizontal overflow at 5 viewports across key public and auth pages.
 *
 * Overflow check: html.scrollWidth vs html.clientWidth (correct approach).
 * Seed outlet slugs: uma-karang, rempah-terrace.
 */

import { expect, test } from '@playwright/test';

const viewports = [
	{ name: '360px', width: 360, height: 800 },
	{ name: '390px', width: 390, height: 844 },
	{ name: '768px', width: 768, height: 1024 },
	{ name: '1024px', width: 1024, height: 768 },
	{ name: '1440px', width: 1440, height: 900 }
];

function noOverflow(page: import('@playwright/test').Page) {
	return page.locator('html').evaluate((el) => ({
		scrollWidth: el.scrollWidth,
		clientWidth: el.clientWidth
	}));
}

test.describe('Responsive audit — public catalog (Uma Karang)', () => {
	for (const vp of viewports) {
		test(`renders without overflow at ${vp.name}`, async ({ page }) => {
			await page.setViewportSize({ width: vp.width, height: vp.height });
			await page.goto('/r/uma-karang');

			await expect(page.getByRole('heading', { name: 'Uma Karang' })).toBeVisible();

			const { scrollWidth, clientWidth } = await noOverflow(page);
			expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
		});
	}
});

test.describe('Responsive audit — public catalog (Rempah Terrace)', () => {
	for (const vp of viewports) {
		test(`renders without overflow at ${vp.name}`, async ({ page }) => {
			await page.setViewportSize({ width: vp.width, height: vp.height });
			await page.goto('/r/rempah-terrace');

			await expect(page.getByRole('heading', { name: 'Rempah Terrace' })).toBeVisible();

			const { scrollWidth, clientWidth } = await noOverflow(page);
			expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
		});
	}
});

test.describe('Responsive audit — landing page', () => {
	for (const vp of viewports) {
		test(`renders without overflow at ${vp.name}`, async ({ page }) => {
			await page.setViewportSize({ width: vp.width, height: vp.height });
			await page.goto('/');

			// Landing page has a heading about digital catalog / platform
			await expect(
				page.getByRole('heading', { name: /katalog digital|ainything/i }).first()
			).toBeVisible();

			const { scrollWidth, clientWidth } = await noOverflow(page);
			expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
		});
	}
});

test.describe('Responsive audit — login page', () => {
	for (const vp of viewports) {
		test(`renders without overflow at ${vp.name}`, async ({ page }) => {
			await page.setViewportSize({ width: vp.width, height: vp.height });
			await page.goto('/login');

			// Login page has email + password fields
			await expect(page.getByLabel('Email')).toBeVisible();

			const { scrollWidth, clientWidth } = await noOverflow(page);
			expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
		});
	}
});

test.describe('Responsive audit — cart page', () => {
	for (const vp of viewports) {
		test(`renders without overflow at ${vp.name}`, async ({ page }) => {
			await page.setViewportSize({ width: vp.width, height: vp.height });
			await page.goto('/r/uma-karang/cart');

			await expect(
				page.getByRole('heading', { name: /review.*order|cart|keranjang/i })
			).toBeVisible({ timeout: 5000 });

			const { scrollWidth, clientWidth } = await noOverflow(page);
			expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
		});
	}
});
