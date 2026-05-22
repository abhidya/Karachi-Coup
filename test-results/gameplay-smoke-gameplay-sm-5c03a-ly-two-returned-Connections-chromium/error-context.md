# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gameplay-smoke.spec.ts >> gameplay smoke >> gameplay: Zardaar Jugaad modal requires exactly two returned Connections
- Location: tests/e2e/gameplay-smoke.spec.ts:169:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.player-list strong').filter({ hasText: 'Ari' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('.player-list strong').filter({ hasText: 'Ari' })

```

```yaml
- main:
  - paragraph: Karachi Coup
  - heading "Bluff. Setting. Rupees. Full Beizzati." [level=1]
  - paragraph: Host runs the table. Players join by room code. Hidden Connections stay private, public snapshots stay clean, and every response prompt is driven by the host-authoritative PeerJS room.
  - text: starting Lobby · Waiting for players. host:join-self
  - paragraph: Room
  - heading "Live snapshot" [level=2]
  - text: Room SL7DL Turn Waiting Lobby
  - paragraph:
    - img "Current scene"
    - text: Waiting for players.
  - paragraph: http://127.0.0.1:4181/Karachi-Coup/#/lobby?room=SL7DL
  - button "Quick rules"
  - button "Start game"
  - button "Reset room"
  - paragraph: Players
  - heading "Connected players" [level=2]
  - list:
    - listitem:
      - strong: Host One
      - text: SL7DL-2ab9c16b 0 Rupees 0 Connections Connected Alive
  - button "Leave room"
  - text: host
```

# Test source

```ts
  1  | import { expect, type Browser, type Page } from '@playwright/test';
  2  | 
  3  | export async function createHostedRoom(page: Page, hostName: string) {
  4  |   await page.goto('./');
  5  |   await page.getByLabel('Your name').fill(hostName);
  6  |   await page.getByRole('button', { name: 'Create room' }).click();
  7  | 
  8  |   await expect(page).toHaveURL(/#\/lobby\?room=([A-Z0-9]+)/);
  9  |   await expect(page.getByTestId('current-scene')).toBeVisible();
  10 | 
  11 |   const roomCode = new URL(page.url()).hash.split('room=').at(-1)?.toUpperCase();
  12 |   if (!roomCode) {
  13 |     throw new Error('Unable to read room code from host URL.');
  14 |   }
  15 | 
  16 |   return roomCode;
  17 | }
  18 | 
  19 | export async function joinRoom(page: Page, roomCode: string, playerName: string) {
  20 |   await page.goto('./#/join');
  21 |   await page.getByTestId('join-code-input').fill(roomCode);
  22 |   await page.getByLabel('Your name').fill(playerName);
  23 |   await page.getByTestId('join-submit-button').click();
  24 | 
  25 |   await expect(page).toHaveURL(new RegExp(`#\\/lobby\\?room=${roomCode}`));
  26 |   await expect(page.getByTestId('current-scene')).toBeVisible();
  27 | }
  28 | 
  29 | export async function startGame(page: Page, roomCode: string) {
  30 |   await page.getByRole('button', { name: 'Start game' }).click();
  31 |   await expect(page).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
  32 | }
  33 | 
  34 | export async function createThreePlayerGame(browser: Browser) {
  35 |   const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage, roomCode } = await createThreePlayerLobby(browser);
  36 |   await startGame(hostPage, roomCode);
  37 |   await expect(playerOnePage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
  38 |   await expect(playerTwoPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
  39 | 
  40 |   return { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage, roomCode };
  41 | }
  42 | 
  43 | export async function createThreePlayerTable(browser: Browser) {
  44 |   return createThreePlayerGame(browser);
  45 | }
  46 | 
  47 | export async function createThreePlayerLobby(browser: Browser) {
  48 |   const hostContext = await browser.newContext();
  49 |   const playerOneContext = await browser.newContext();
  50 |   const playerTwoContext = await browser.newContext();
  51 |   const hostPage = await hostContext.newPage();
  52 |   const playerOnePage = await playerOneContext.newPage();
  53 |   const playerTwoPage = await playerTwoContext.newPage();
  54 | 
  55 |   const roomCode = await createHostedRoom(hostPage, 'Host One');
  56 |   await joinRoom(playerOnePage, roomCode, 'Ari');
  57 |   await joinRoom(playerTwoPage, roomCode, 'Bea');
  58 | 
> 59 |   await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Ari' })).toBeVisible();
     |                                                                                    ^ Error: expect(locator).toBeVisible() failed
  60 |   await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Bea' })).toBeVisible();
  61 | 
  62 |   return { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage, roomCode };
  63 | }
  64 | 
  65 | export async function activePlayerName(page: Page) {
  66 |   const name = (await page.getByTestId('active-player-name').first().textContent())?.trim();
  67 |   if (!name) throw new Error('Could not determine the active player.');
  68 |   return name;
  69 | }
  70 | 
  71 | export async function pageForActivePlayer(activeName: string, hostPage: Page, playerOnePage: Page, playerTwoPage: Page) {
  72 |   const normalized = activeName.trim().toLowerCase();
  73 |   if (normalized.includes('host one')) return hostPage;
  74 |   if (normalized.includes('ari')) return playerOnePage;
  75 |   return playerTwoPage;
  76 | }
  77 | 
  78 | export async function pageForPlayerName(playerName: string, hostPage: Page, playerOnePage: Page, playerTwoPage: Page) {
  79 |   const normalized = playerName.trim().toLowerCase();
  80 |   if (normalized.includes('host one')) return hostPage;
  81 |   if (normalized.includes('ari')) return playerOnePage;
  82 |   return playerTwoPage;
  83 | }
  84 | 
  85 | export async function waitForTurnName(page: Page, name: string) {
  86 |   await expect(page.getByTestId('active-player-name').first()).toHaveText(name);
  87 | }
  88 | 
```