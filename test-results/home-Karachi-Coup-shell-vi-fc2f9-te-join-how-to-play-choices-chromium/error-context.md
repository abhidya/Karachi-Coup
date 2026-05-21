# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: home.spec.ts >> Karachi Coup shell >> visual: home screen shows polished create/join/how-to-play choices
- Location: tests/e2e/home.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('open-rules-button')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByTestId('open-rules-button')

```

```yaml
- main:
  - paragraph: Karachi Coup
  - heading "Bluff. Setting. Rupees. Full Beizzati." [level=1]
  - paragraph: Host runs the table. Players join by room code. Hidden Connections stay private, public snapshots stay clean, and every response prompt is driven by the host-authoritative PeerJS room.
  - text: idle Waiting for room sync idle
  - navigation:
    - button "Home"
    - button "Host room"
    - button "Join room"
    - button "Lobby"
    - button "Game"
  - paragraph: Start here
  - heading "Karachi Coup" [level=2]
  - paragraph: Bluff. Setting. Rupees. Full Beizzati.
  - text: Your name
  - textbox "Your name":
    - /placeholder: Player name
    - text: Player
  - button "Create room"
  - button "Join a room"
  - button "Host a room"
  - button "Join screen"
  - button "Leave current room" [disabled]
  - img "Current scene"
  - paragraph: Session
  - heading "Restore or start over" [level=2]
  - paragraph:
    - text: "Mode:"
    - strong: idle
  - paragraph:
    - text: "Room:"
    - strong: —
  - paragraph:
    - text: "Name:"
    - strong: Player
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test.describe('Karachi Coup shell', () => {
  4  |   test('visual: home screen shows polished create/join/how-to-play choices', async ({ page }) => {
  5  |     await page.goto('./');
  6  | 
  7  |     await expect(page.getByTestId('home-title')).toBeVisible();
  8  |     await expect(page.getByRole('heading', { name: 'Bluff. Setting. Rupees. Full Beizzati.' })).toBeVisible();
  9  |     await expect(page.getByTestId('create-room-button')).toBeVisible();
  10 |     await expect(page.getByTestId('join-room-button')).toBeVisible();
> 11 |     await expect(page.getByTestId('open-rules-button')).toBeVisible();
     |                                                         ^ Error: expect(locator).toBeVisible() failed
  12 |   });
  13 | 
  14 |   test('peer room: host creates room and shows room code', async ({ page }) => {
  15 |     await page.goto('./');
  16 |     await page.getByTestId('create-room-button').click();
  17 | 
  18 |     await expect(page).toHaveURL(/#\/(host|lobby)\?room=/);
  19 |     await expect(page.getByTestId('room-link')).toBeVisible();
  20 |   });
  21 | 
  22 |   test('peer room: two players join host room', async ({ page }) => {
  23 |     await page.goto('./#/join');
  24 | 
  25 |     await page.getByTestId('join-code-input').fill('abc12');
  26 |     await page.getByTestId('display-name-input').fill('Player One');
  27 |     await page.getByTestId('join-submit-button').click();
  28 | 
  29 |     await expect(page).toHaveURL(/#\/lobby\?room=ABC12/);
  30 |     await expect(page.getByText('Waiting for sync')).toBeVisible();
  31 |     await expect(page.getByRole('button', { name: 'Request resync' })).toBeVisible();
  32 |   });
  33 | });
  34 | 
```