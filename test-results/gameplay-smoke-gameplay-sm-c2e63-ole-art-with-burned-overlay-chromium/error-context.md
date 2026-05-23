# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gameplay-smoke.spec.ts >> gameplay smoke >> visual: burned Connections render actual role art with burned overlay
- Location: tests/e2e/gameplay-smoke.spec.ts:221:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4181/Karachi-Coup/
Call log:
  - navigating to "http://127.0.0.1:4181/Karachi-Coup/", waiting until "load"

```

# Test source

```ts
  1  | import { expect, type Browser, type Page } from '@playwright/test';
  2  | import { hostStorageKey } from '../../src/network/storage';
  3  | 
  4  | export async function createHostedRoom(page: Page, hostName: string) {
> 5  |   await page.goto('./');
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4181/Karachi-Coup/
  6  |   await page.getByLabel('Your name').fill(hostName);
  7  |   await page.getByRole('button', { name: 'Create room' }).click();
  8  | 
  9  |   await expect(page).toHaveURL(/#\/lobby\?room=([A-Z0-9]+)/);
  10 |   await expect(page.getByTestId('current-scene')).toBeVisible();
  11 | 
  12 |   const roomCode = new URL(page.url()).hash.split('room=').at(-1)?.toUpperCase();
  13 |   if (!roomCode) {
  14 |     throw new Error('Unable to read room code from host URL.');
  15 |   }
  16 | 
  17 |   return roomCode;
  18 | }
  19 | 
  20 | export async function joinRoom(page: Page, roomCode: string, playerName: string) {
  21 |   await page.goto(`./#/join?room=${roomCode}`);
  22 |   await expect(page.getByTestId('join-code-input')).toHaveValue(roomCode);
  23 |   await page.getByTestId('join-code-input').fill(roomCode);
  24 |   await page.getByLabel('Your name').fill(playerName);
  25 |   await page.getByTestId('join-submit-button').click();
  26 | 
  27 |   await expect(page).toHaveURL(new RegExp(`#\\/lobby\\?room=${roomCode}`));
  28 |   await expect(page.getByTestId('current-scene')).toBeVisible();
  29 | }
  30 | 
  31 | export async function startGame(page: Page, roomCode: string) {
  32 |   await page.getByRole('button', { name: 'Start game' }).click();
  33 |   await expect(page).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
  34 | }
  35 | 
  36 | export async function createThreePlayerGame(browser: Browser) {
  37 |   const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage, roomCode } = await createThreePlayerLobby(browser);
  38 |   await startGame(hostPage, roomCode);
  39 |   await expect(playerOnePage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
  40 |   await expect(playerTwoPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
  41 | 
  42 |   return { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage, roomCode };
  43 | }
  44 | 
  45 | export async function createThreePlayerTable(browser: Browser) {
  46 |   return createThreePlayerGame(browser);
  47 | }
  48 | 
  49 | export async function createThreePlayerLobby(browser: Browser) {
  50 |   const hostContext = await browser.newContext();
  51 |   const playerOneContext = await browser.newContext();
  52 |   const playerTwoContext = await browser.newContext();
  53 |   const hostPage = await hostContext.newPage();
  54 |   const playerOnePage = await playerOneContext.newPage();
  55 |   const playerTwoPage = await playerTwoContext.newPage();
  56 | 
  57 |   const roomCode = await createHostedRoom(hostPage, 'Host One');
  58 |   await joinRoom(playerOnePage, roomCode, 'Ari');
  59 |   await joinRoom(playerTwoPage, roomCode, 'Bea');
  60 | 
  61 |   const storageKey = hostStorageKey(roomCode);
  62 |   await expect
  63 |     .poll(async () => hostPage.evaluate((key) => window.localStorage.getItem(key), storageKey), { timeout: 30_000 })
  64 |     .toContain('Ari');
  65 |   await expect
  66 |     .poll(async () => hostPage.evaluate((key) => window.localStorage.getItem(key), storageKey), { timeout: 30_000 })
  67 |     .toContain('Bea');
  68 | 
  69 |   return { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage, roomCode };
  70 | }
  71 | 
  72 | export async function activePlayerName(page: Page) {
  73 |   const name = (await page.getByTestId('active-player-name').first().textContent())?.trim();
  74 |   if (!name) throw new Error('Could not determine the active player.');
  75 |   return name;
  76 | }
  77 | 
  78 | export async function pageForActivePlayer(activeName: string, hostPage: Page, playerOnePage: Page, playerTwoPage: Page) {
  79 |   const normalized = activeName.trim().toLowerCase();
  80 |   if (normalized.includes('host one')) return hostPage;
  81 |   if (normalized.includes('ari')) return playerOnePage;
  82 |   return playerTwoPage;
  83 | }
  84 | 
  85 | export async function pageForPlayerName(playerName: string, hostPage: Page, playerOnePage: Page, playerTwoPage: Page) {
  86 |   const normalized = playerName.trim().toLowerCase();
  87 |   if (normalized.includes('host one')) return hostPage;
  88 |   if (normalized.includes('ari')) return playerOnePage;
  89 |   return playerTwoPage;
  90 | }
  91 | 
  92 | export async function waitForTurnName(page: Page, name: string) {
  93 |   await expect(page.getByTestId('active-player-name').first()).toHaveText(name);
  94 | }
  95 | 
```