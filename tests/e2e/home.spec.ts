import { expect, test } from '@playwright/test';

test.describe('Karachi Coup shell', () => {
  test('visual: home screen shows polished create/join/how-to-play choices', async ({ page }) => {
    await page.goto('./');

    await expect(page.getByTestId('home-title')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bluff. Setting. Rupees. Full Beizzati.' })).toBeVisible();
    await expect(page.getByTestId('create-room-button')).toBeVisible();
    await expect(page.getByTestId('join-room-button')).toBeVisible();
    await expect(page.getByTestId('open-rules-button')).toBeVisible();
  });

  test('peer room: host creates room and shows room code', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('create-room-button').click();

    await expect(page).toHaveURL(/#\/(host|lobby)\?room=/);
    await expect(page.getByTestId('room-link')).toBeVisible();
  });

  test('peer room: two players join host room', async ({ page }) => {
    await page.goto('./#/join');

    await page.getByTestId('join-code-input').fill('abc12');
    await page.getByTestId('display-name-input').fill('Player One');
    await page.getByTestId('join-submit-button').click();

    await expect(page).toHaveURL(/#\/lobby\?room=ABC12/);
    await expect(page.getByText('Waiting for sync')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request resync' })).toBeVisible();
  });
});
