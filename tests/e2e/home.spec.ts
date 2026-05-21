import { expect, test } from '@playwright/test';

test.describe('Karachi Coup shell', () => {
  test('home page shows the game title and primary actions', async ({ page }) => {
    await page.goto('./');

    await expect(page.getByTestId('home-title')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bluff. Setting. Rupees. Full Beizzati.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Host a room' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join a room' })).toBeVisible();
  });

  test('host flow opens the lobby shell and shows a room code', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('create-room-button').click();

    await expect(page).toHaveURL(/#\/(host|lobby)\?room=/);
    await expect(page.getByText('Room link:')).toBeVisible();
  });

  test('join flow accepts a room code and opens the lobby shell', async ({ page }) => {
    await page.goto('./#/join');

    await page.getByTestId('join-code-input').fill('abc12');
    await page.getByTestId('display-name-input').fill('Player One');
    await page.getByTestId('join-submit-button').click();

    await expect(page).toHaveURL(/#\/lobby\?room=ABC12/);
    await expect(page.getByText('Waiting for sync')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request resync' })).toBeVisible();
  });
});
