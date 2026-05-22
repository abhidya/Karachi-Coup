import { expect, test } from '@playwright/test';
import { createThreePlayerGame, createThreePlayerLobby } from './helpers';

const peerMode = process.env.E2E_PEER_MODE === '1';
const peerDescribe = peerMode ? test.describe : test.describe.skip;

peerDescribe('peer room', () => {
  test('peer room: host creates room and shows room code', async ({ browser }) => {
    const { hostContext, hostPage, playerOneContext, playerTwoContext } = await createThreePlayerLobby(browser);

    await expect(hostPage.getByTestId('current-scene')).toBeVisible();
    await expect(hostPage.getByTestId('room-link')).toBeVisible();

    await hostContext.close();
    await playerOneContext.close();
    await playerTwoContext.close();
  });

  test('visual: host lobby shows large room code and connected players', async ({ browser }) => {
    const { hostContext, hostPage, playerOneContext, playerTwoContext } = await createThreePlayerLobby(browser);

    await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Ari' })).toBeVisible();
    await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Bea' })).toBeVisible();

    await hostContext.close();
    await playerOneContext.close();
    await playerTwoContext.close();
  });

  test('peer room: two players join host room', async ({ browser }) => {
    const { hostContext, hostPage, playerOneContext, playerTwoContext } = await createThreePlayerLobby(browser);
    await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Ari' })).toBeVisible();
    await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Bea' })).toBeVisible();

    await hostContext.close();
    await playerOneContext.close();
    await playerTwoContext.close();
  });

  test('peer room: host can start game with two players', async ({ browser }) => {
    const { hostContext, hostPage, playerOneContext, playerTwoContext, roomCode } = await createThreePlayerLobby(browser);
    await hostPage.getByRole('button', { name: 'Start game' }).click();
    await expect(hostPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));

    await hostContext.close();
    await playerOneContext.close();
    await playerTwoContext.close();
  });

  test('peer room: each player receives exactly two private Connections', async ({ browser }) => {
    const { hostContext, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);

    await expect(playerOnePage.getByTestId('private-connection-card')).toHaveCount(2);
    await expect(playerTwoPage.getByTestId('private-connection-card')).toHaveCount(2);

    await hostContext.close();
    await playerOneContext.close();
    await playerTwoContext.close();
  });

  test('peer room: public table does not reveal opponent hidden Connections', async ({ browser }) => {
    const { hostContext, hostPage, playerOneContext, playerTwoContext } = await createThreePlayerGame(browser);

    await expect(hostPage.getByTestId('player-revealed-connections').locator('img')).toHaveCount(0);
    await expect(hostPage.getByTestId('player-hidden-count').first()).toBeVisible();

    await hostContext.close();
    await playerOneContext.close();
    await playerTwoContext.close();
  });
});
