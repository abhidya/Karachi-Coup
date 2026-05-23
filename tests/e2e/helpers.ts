import { expect, type Browser, type Page } from '@playwright/test';
import { hostStorageKey } from '../../src/network/storage';

export async function createHostedRoom(page: Page, hostName: string) {
  await page.goto('./');
  await page.getByLabel('Your name').fill(hostName);
  await page.getByRole('button', { name: 'Create room' }).click();

  await expect(page).toHaveURL(/#\/lobby\?room=([A-Z0-9]+)/);
  await expect(page.getByTestId('current-scene')).toBeVisible();

  const roomCode = new URL(page.url()).hash.split('room=').at(-1)?.toUpperCase();
  if (!roomCode) {
    throw new Error('Unable to read room code from host URL.');
  }

  return roomCode;
}

export async function joinRoom(page: Page, roomCode: string, playerName: string) {
  await page.goto(`./#/join?room=${roomCode}`);
  await expect(page.getByTestId('join-code-input')).toHaveValue(roomCode);
  await page.getByTestId('join-code-input').fill(roomCode);
  await page.getByLabel('Your name').fill(playerName);
  await page.getByTestId('join-submit-button').click();

  await expect(page).toHaveURL(new RegExp(`#\\/lobby\\?room=${roomCode}`));
  await expect(page.getByTestId('current-scene')).toBeVisible();
}

export async function startGame(page: Page, roomCode: string) {
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
}

export async function createThreePlayerGame(browser: Browser) {
  const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage, roomCode } = await createThreePlayerLobby(browser);
  await startGame(hostPage, roomCode);
  await expect(playerOnePage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
  await expect(playerTwoPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));

  return { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage, roomCode };
}

export async function createThreePlayerTable(browser: Browser) {
  return createThreePlayerGame(browser);
}

export async function createThreePlayerLobby(browser: Browser) {
  const hostContext = await browser.newContext();
  const playerOneContext = await browser.newContext();
  const playerTwoContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const playerOnePage = await playerOneContext.newPage();
  const playerTwoPage = await playerTwoContext.newPage();

  const roomCode = await createHostedRoom(hostPage, 'Host One');
  await joinRoom(playerOnePage, roomCode, 'Ari');
  await joinRoom(playerTwoPage, roomCode, 'Bea');

  const storageKey = hostStorageKey(roomCode);
  await expect
    .poll(async () => hostPage.evaluate((key) => window.localStorage.getItem(key), storageKey), { timeout: 30_000 })
    .toContain('Ari');
  await expect
    .poll(async () => hostPage.evaluate((key) => window.localStorage.getItem(key), storageKey), { timeout: 30_000 })
    .toContain('Bea');

  return { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage, roomCode };
}

export async function activePlayerName(page: Page) {
  const name = (await page.getByTestId('active-player-name').first().textContent())?.trim();
  if (!name) throw new Error('Could not determine the active player.');
  return name;
}

export async function pageForActivePlayer(activeName: string, hostPage: Page, playerOnePage: Page, playerTwoPage: Page) {
  const normalized = activeName.trim().toLowerCase();
  if (normalized.includes('host one')) return hostPage;
  if (normalized.includes('ari')) return playerOnePage;
  return playerTwoPage;
}

export async function pageForPlayerName(playerName: string, hostPage: Page, playerOnePage: Page, playerTwoPage: Page) {
  const normalized = playerName.trim().toLowerCase();
  if (normalized.includes('host one')) return hostPage;
  if (normalized.includes('ari')) return playerOnePage;
  return playerTwoPage;
}

export async function waitForTurnName(page: Page, name: string) {
  await expect(page.getByTestId('active-player-name').first()).toHaveText(name);
}
