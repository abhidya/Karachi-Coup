import { expect, test } from '@playwright/test';

test('smoke: app loads Karachi Coup home screen', async ({ page }) => {
  await page.goto('./');

  await expect(page.getByTestId('home-title')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bluff. Setting. Rupees. Full Beizzati.' })).toBeVisible();
});

test('smoke: page has no uncaught browser errors on load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('./');
  await expect(page.getByTestId('home-title')).toBeVisible();
  expect(errors).toEqual([]);
});
