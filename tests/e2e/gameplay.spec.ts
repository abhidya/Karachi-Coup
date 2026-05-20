import { expect, test } from '@playwright/test';

async function createHostedRoom(page: import('@playwright/test').Page, hostName: string) {
  await page.goto('./#/host');
  await page.getByLabel('Your name').fill(hostName);
  await page.getByRole('button', { name: 'Create room' }).click();

  await expect(page).toHaveURL(/#\/lobby\?room=([A-Z0-9]+)/);
  const roomCode = new URL(page.url()).hash.split('room=').at(-1)?.toUpperCase();

  if (!roomCode) {
    throw new Error('Unable to read room code from host URL.');
  }

  return roomCode;
}

async function joinRoom(page: import('@playwright/test').Page, roomCode: string, playerName: string) {
  await page.goto('./#/join');
  await page.getByLabel('Room code').fill(roomCode);
  await page.getByLabel('Your name').fill(playerName);
  await page.getByRole('button', { name: 'Join room' }).last().click();

  await expect(page).toHaveURL(new RegExp(`#\\/lobby\\?room=${roomCode}`));
  await expect(page.getByText('Waiting for sync')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request resync' })).toBeVisible();
}

test.describe('Karachi Coup gameplay smoke', () => {
  test('host-create/join flow connects two players and starts a room', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const playerOneContext = await browser.newContext();
    const playerTwoContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerOnePage = await playerOneContext.newPage();
    const playerTwoPage = await playerTwoContext.newPage();

    const roomCode = await createHostedRoom(hostPage, 'Host One');
    await joinRoom(playerOnePage, roomCode, 'Ari');
    await joinRoom(playerTwoPage, roomCode, 'Bea');

    await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Ari' })).toBeVisible();
    await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Bea' })).toBeVisible();

    await hostPage.getByRole('button', { name: 'Start game' }).click();

    await expect(hostPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
    await expect(playerOnePage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
    await expect(playerTwoPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));

    await expect(hostPage.getByText('Game started')).toBeVisible();
    await expect(hostPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
    await expect(playerOnePage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
    await expect(playerTwoPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));

    const activeRow = hostPage.locator('.player-list__row--active strong').first();
    const activePlayerName = (await activeRow.textContent())?.trim();

    if (!activePlayerName) {
      throw new Error('Could not determine the active player.');
    }

    const activePage = activePlayerName === 'Ari' ? playerOnePage : playerTwoPage;
    await expect(activePage.getByRole('button', { name: 'Chai Paisa' })).toBeVisible();

    await hostContext.close();
    await playerOneContext.close();
    await playerTwoContext.close();
  });

  test('reducer-backed turn smoke advances after Chai Paisa', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const playerOneContext = await browser.newContext();
    const playerTwoContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerOnePage = await playerOneContext.newPage();
    const playerTwoPage = await playerTwoContext.newPage();

    const roomCode = await createHostedRoom(hostPage, 'Host One');
    await joinRoom(playerOnePage, roomCode, 'Ari');
    await joinRoom(playerTwoPage, roomCode, 'Bea');

    await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Ari' })).toBeVisible();
    await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Bea' })).toBeVisible();

    await hostPage.getByRole('button', { name: 'Start game' }).click();

    await expect(hostPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
    await expect(playerOnePage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
    await expect(playerTwoPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
    await expect(hostPage.locator('.player-list__row--active')).toBeVisible();

    const activeRow = hostPage.locator('.player-list__row--active strong').first();
    const activePlayerName = (await activeRow.textContent())?.trim();

    if (!activePlayerName) {
      throw new Error('Could not determine the active player.');
    }

    const activePage = activePlayerName === 'Ari' ? playerOnePage : playerTwoPage;
    const nextPlayerName = activePlayerName === 'Ari' ? 'Bea' : 'Ari';

    await expect(activePage.getByRole('button', { name: 'Chai Paisa' })).toBeVisible();
    await activePage.getByRole('button', { name: 'Chai Paisa' }).click();

    await expect(hostPage.getByText('Chai Paisa')).toBeVisible();
    await expect(hostPage.locator('.player-list__row--active strong').first()).toHaveText(nextPlayerName);
    await hostContext.close();
    await playerOneContext.close();
    await playerTwoContext.close();
  });
});
