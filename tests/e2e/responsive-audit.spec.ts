import { expect, test } from '@playwright/test';

const viewports = [
	{ name: '360px', width: 360, height: 800 },
	{ name: '390px', width: 390, height: 844 },
	{ name: '768px', width: 768, height: 1024 },
	{ name: '1024px', width: 1024, height: 768 },
	{ name: '1440px', width: 1440, height: 900 }
];

test.describe('Responsive audit — public catalog', () => {
	for (const vp of viewports) {
		test(`renders at ${vp.name}`, async ({ page }) => {
			await page.setViewportSize({ width: vp.width, height: vp.height });
			await page.goto('/r/uma-karang');

			await expect(page.getByRole('heading', { name: 'Uma Karang' })).toBeVisible();
			await expect(page.getByText('Browse menu')).toBeVisible();

			// Check no horizontal overflow
			const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
			expect(bodyWidth).toBeLessThanOrEqual(vp.width + 1);
		});
	}
});

test.describe('Responsive audit — landing page', () => {
	for (const vp of viewports) {
		test(`renders at ${vp.name}`, async ({ page }) => {
			await page.setViewportSize({ width: vp.width, height: vp.height });
			await page.goto('/');

			await expect(page.getByRole('heading', { name: /lingua/i }).first()).toBeVisible();

			const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
			expect(bodyWidth).toBeLessThanOrEqual(vp.width + 1);
		});
	}
});

test.describe('Responsive audit — login', () => {
	for (const vp of viewports) {
		test(`renders at ${vp.name}`, async ({ page }) => {
			await page.setViewportSize({ width: vp.width, height: vp.height });
			await page.goto('/login');

			await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();

			const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
			expect(bodyWidth).toBeLessThanOrEqual(vp.width + 1);
		});
	}
});

test.describe('Responsive audit — cart', () => {
	for (const vp of viewports) {
		test(`renders at ${vp.name}`, async ({ page }) => {
			await page.setViewportSize({ width: vp.width, height: vp.height });
			await page.goto('/r/uma-karang/cart');

			await expect(page.getByRole('heading', { name: /cart/i })).toBeVisible();

			const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
			expect(bodyWidth).toBeLessThanOrEqual(vp.width + 1);
		});
	}
});

test.describe('Responsive audit — order tracking', () => {
	for (const vp of viewports) {
		test(`renders at ${vp.name}`, async ({ page }) => {
			await page.setViewportSize({ width: vp.width, height: vp.height });
			await page.goto('/r/uma-karang/order/test-order-id');

			await expect(page.getByRole('heading', { name: /order/i })).toBeVisible();

			const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
			expect(bodyWidth).toBeLessThanOrEqual(vp.width + 1);
		});
	}
});
