import { expect, test } from '@playwright/test';
import { hostStorageKey } from '../../src/network/storage';
import { createHostedRoom } from './helpers';

const peerMode = process.env.E2E_PEER_MODE === '1';
const peerDescribe = peerMode ? test.describe : test.describe.skip;

test.describe('join link', () => {
  test('join link: opening shared room link lands on JoinRoomScreen', async ({ page }) => {
    await page.goto('./#/join?room=U9UPH');

    await expect(page.getByText('Enter a room code')).toBeVisible();
    await expect(page.getByTestId('join-submit-button')).toBeVisible();
  });

  test('join link: room code is prefilled from URL', async ({ page }) => {
    await page.goto('./#/join?room=U9UPH');

    await expect(page.getByTestId('join-code-input')).toHaveValue('U9UPH');
  });
});

peerDescribe('join link', () => {
  test('join link: player can join from shared link', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const joinContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const joinPage = await joinContext.newPage();

    const roomCode = await createHostedRoom(hostPage, 'Host One');
    await joinPage.goto(`./#/join?room=${roomCode}`);
    await joinPage.getByLabel('Your name').fill('Ari');
    await joinPage.getByTestId('join-submit-button').click();

    await expect(joinPage).toHaveURL(new RegExp(`#\\/lobby\\?room=${roomCode}`));
    await expect(joinPage.getByTestId('current-scene')).toBeVisible();

    const storageKey = hostStorageKey(roomCode);
    await expect
      .poll(async () => hostPage.evaluate((key) => window.localStorage.getItem(key), storageKey), { timeout: 30_000 })
      .toContain('Ari');

    await hostContext.close();
    await joinContext.close();
  });
});
