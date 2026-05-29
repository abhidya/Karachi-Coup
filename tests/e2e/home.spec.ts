import { expect, test } from '@playwright/test';

test.describe('Karachi Coup shell', () => {
  test('visual: home screen shows polished create/join/how-to-play choices', async ({ page }) => {
    await page.goto('./');

    await expect(page.getByTestId('home-title')).toBeVisible();
    await expect(page.getByTestId('home-title')).toContainText('Enter your table name');
    await expect(page.getByText('Choose your path')).toBeVisible();
    await expect(page.getByText('Create Room makes you Player 1')).toBeVisible();
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
    await expect(page.getByTestId('room-link')).toContainText('#/join?room=');
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

  test('peer room: join screen create-room alternative creates a real host room', async ({ page }) => {
    await page.goto('./#/join');

    await page.getByTestId('join-code-input').fill('lklfl');
    await page.getByTestId('display-name-input').fill('mann');
    await page.getByTestId('join-create-room-button').click();

    await expect(page).toHaveURL(/#\/host\?room=[A-Z0-9]+/);
    await expect(page.getByTestId('room-code')).not.toContainText('No room yet');
    await expect(page.getByTestId('room-link')).toContainText('#/join?room=');
  });

  test('peer room: direct host route can create a room instead of dead-ending', async ({ page }) => {
    await page.goto('./#/host');

    await expect(page.getByText('No room exists yet')).toBeVisible();
    await page.getByTestId('host-create-room-button').click();

    await expect(page).toHaveURL(/#\/host\?room=[A-Z0-9]+/);
    await expect(page.getByTestId('room-link')).toContainText('#/join?room=');
  });

  test('shared lobby/game deep links route new visitors to the join form', async ({ page }) => {
    await page.goto('./#/lobby?room=U9VGH');
    await expect(page).toHaveURL(/#\/join\?room=U9VGH/);
    await expect(page.getByTestId('join-code-input')).toHaveValue('U9VGH');

    await page.goto('./#/game?room=U9VGH');
    await expect(page).toHaveURL(/#\/join\?room=U9VGH/);
    await expect(page.getByTestId('join-submit-button')).toBeVisible();
  });

  test('shared room links ignore stale sessions from another room', async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => {
      sessionStorage.setItem(
        'karachi-coup:session',
        JSON.stringify({
          version: 1,
          value: { mode: 'client', roomId: 'OLD12', displayName: 'Stale Player' },
        }),
      );
    });

    await page.goto('./#/lobby?room=U9VGH');
    await expect(page).toHaveURL(/#\/join\?room=U9VGH/);
    await expect(page.getByTestId('join-code-input')).toHaveValue('U9VGH');
  });
});
