import { expect, test } from '@playwright/test';

test('deployment: built page serves production app', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Karachi Coup');
  await expect(page.getByTestId('home-title')).toBeVisible();
});

test('deployment: important public assets are reachable', async ({ page, request }) => {
  await page.goto('./');
  const base = new URL(page.url());
  const assetPaths = ['malik-saab.png', 'game-table-bg.png', 'action-reference.png'];

  for (const path of assetPaths) {
    const response = await request.get(new URL(path, base).toString());
    expect(response.ok(), path).toBe(true);
  }
});
