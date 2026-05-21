import { expect, type Browser, type Page } from '@playwright/test';

export async function createHostedRoom(page: Page, hostName: string) {
  await page.goto('./#/host');
  await page.getByLabel('Display name').fill(hostName);
  await page.getByRole('button', { name: 'Create room' }).click();

  await expect(page.getByTestId('room-code')).toContainText('Room code:');
  await expect(page).toHaveURL(/#\/lobby\?room=([A-Z0-9]+)/);

  const roomCode = new URL(page.url()).hash.split('room=').at(-1)?.toUpperCase();
  if (!roomCode) {
    throw new Error('Unable to read room code from host URL.');
  }

  return roomCode;
}

export async function joinRoom(page: Page, roomCode: string, playerName: string) {
  await page.goto('./#/join');
  await page.getByTestId('join-code-input').fill(roomCode);
  await page.getByLabel('Display name').fill(playerName);
  await page.getByTestId('join-submit-button').click();

  await expect(page).toHaveURL(new RegExp(`#\\/lobby\\?room=${roomCode}`));
  await expect(page.getByTestId('client-status')).toBeVisible();
}

export async function startGame(page: Page, roomCode: string) {
  await page.getByTestId('start-game-button').click();
  await expect(page).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
}

export async function createThreePlayerTable(browser: Browser) {
  const hostContext = await browser.newContext();
  const playerOneContext = await browser.newContext();
  const playerTwoContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const playerOnePage = await playerOneContext.newPage();
  const playerTwoPage = await playerTwoContext.newPage();

  const roomCode = await createHostedRoom(hostPage, 'Host One');
  await joinRoom(playerOnePage, roomCode, 'Ari');
  await joinRoom(playerTwoPage, roomCode, 'Bea');

  await expect(hostPage.getByTestId('connected-player-list')).toContainText('Ari');
  await expect(hostPage.getByTestId('connected-player-list')).toContainText('Bea');

  await startGame(hostPage, roomCode);
  await expect(playerOnePage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
  await expect(playerTwoPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));

  return { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage, roomCode };
}

export async function activePlayerName(page: Page) {
  const name = (await page.getByTestId('active-player-name').first().textContent())?.trim();
  if (!name) throw new Error('Could not determine the active player.');
  return name;
}

export async function pageForActivePlayer(activeName: string, playerOnePage: Page, playerTwoPage: Page) {
  return activeName === 'Ari' ? playerOnePage : playerTwoPage;
}

export async function waitForTurnName(page: Page, name: string) {
  await expect(page.getByTestId('active-player-name').first()).toHaveText(name);
}
