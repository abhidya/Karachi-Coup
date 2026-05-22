import { expect, test } from '@playwright/test';
import { activePlayerName, createThreePlayerLobby, pageForActivePlayer, startGame, waitForTurnName } from './helpers';
const peerMode = process.env.E2E_PEER_MODE === '1';
const peerDescribe = peerMode ? test.describe : test.describe.skip;

peerDescribe('Karachi Coup gameplay smoke', () => {
  test('host-create/join flow connects two players and starts a room', async ({ browser }) => {
    const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage, roomCode } =
      await createThreePlayerLobby(browser);
    await startGame(hostPage, roomCode);

    await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Ari' })).toBeVisible();
    await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Bea' })).toBeVisible();

  await expect(hostPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
  await expect(playerOnePage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
  await expect(playerTwoPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));

    const activeName = await activePlayerName(hostPage);
    if (!activeName) {
      throw new Error('Could not determine the active player.');
    }

    const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);
    await expect(activePage.getByRole('button', { name: 'Chai Paisa' })).toBeVisible();

    await hostContext.close();
    await playerOneContext.close();
    await playerTwoContext.close();
  });

  test('reducer-backed turn smoke advances after Chai Paisa', async ({ browser }) => {
    const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage, roomCode } =
      await createThreePlayerLobby(browser);
    await startGame(hostPage, roomCode);

    await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Ari' })).toBeVisible();
    await expect(hostPage.locator('.player-list strong').filter({ hasText: 'Bea' })).toBeVisible();

  await expect(hostPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
  await expect(playerOnePage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
  await expect(playerTwoPage).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`));
  await expect(hostPage.locator('.player-list__row--active')).toBeVisible();

    const activeName = await activePlayerName(hostPage);
    if (!activeName) {
      throw new Error('Could not determine the active player.');
    }

    const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);
    const nextPlayerName = activeName === 'Host One' ? 'Ari' : activeName === 'Ari' ? 'Bea' : 'Host One';

    await expect(activePage.getByRole('button', { name: 'Chai Paisa' })).toBeVisible();
    await activePage.getByRole('button', { name: 'Chai Paisa' }).click();

    await waitForTurnName(hostPage, nextPlayerName);
    await hostContext.close();
    await playerOneContext.close();
    await playerTwoContext.close();
  });
});
