import { expect, test } from '@playwright/test';

test.describe('Karachi Coup shell', () => {
  test('home page shows the game title and primary actions', async ({ page }) => {
    await page.goto('./');

    await expect(page.getByText('Karachi Coup')).toBeVisible();
    await expect(page.getByText('Bluff. Setting. Rupees. Full Beizzati.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Host a room' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join a room' })).toBeVisible();
  });

  test('host flow opens the lobby shell and shows a room code', async ({ page }) => {
    await page.goto('./#/host');

    await page.getByLabel('Your name').fill('Host One');
    await page.getByRole('button', { name: 'Create room' }).click();

    await expect(page).toHaveURL(/#\/lobby\?room=/);
    await expect(page.getByText('Host device must stay open')).toBeVisible();
    await expect(page.getByText('Room code:')).toBeVisible();
  });

  test('join flow accepts a room code and opens the lobby shell', async ({ page }) => {
    await page.goto('./#/join');

    await page.getByLabel('Room code').fill('abc12');
    await page.getByLabel('Your name').fill('Player One');
    await page.getByRole('button', { name: 'Join room' }).last().click();

    await expect(page).toHaveURL(/#\/lobby\?room=ABC12/);
    await expect(page.getByText('Waiting for sync')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request resync' })).toBeVisible();
  });
});
