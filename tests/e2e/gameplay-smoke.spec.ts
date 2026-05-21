import { expect, test } from '@playwright/test';
import { activePlayerName, createThreePlayerTable, pageForActivePlayer, waitForTurnName } from './helpers';

const peerMode = process.env.E2E_PEER_MODE === '1';
const peerDescribe = peerMode ? test.describe : test.describe.skip;

peerDescribe('gameplay smoke', () => {
test('visual: game screen shows current scene, your move, private hand, public table, and action log', async ({ browser }) => {
  const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage } = await createThreePlayerTable(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, playerOnePage, playerTwoPage);

  await expect(activePage.getByTestId('current-scene')).toBeVisible();
  await expect(activePage.getByTestId('private-panel')).toBeVisible();
  await expect(activePage.getByTestId('public-player-table')).toBeVisible();
  await expect(activePage.getByTestId('action-log')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: active player can take Chai Paisa and rupees update', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerTable(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, playerOnePage, playerTwoPage);

  await activePage.getByTestId('action-button-CHAI_PAISA').click();
  await waitForTurnName(hostPage, name === 'Ari' ? 'Bea' : 'Ari');
  await expect(activePage.getByTestId('private-rupees')).toContainText('3');

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Kiraya Collection does not open target picker', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerTable(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, playerOnePage, playerTwoPage);

  await activePage.getByTestId('action-button-KIRAYA_COLLECTION').click();
  await expect(activePage.getByTestId('target-picker')).toHaveCount(0);

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: challenge prompt shows Call Bakwaas and Let It Slide', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerTable(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, playerOnePage, playerTwoPage);
  const otherPage = activePage === playerOnePage ? playerTwoPage : playerOnePage;

  await activePage.getByTestId('action-button-KIRAYA_COLLECTION').click();
  await expect(otherPage.getByTestId('response-call-bakwaas')).toBeVisible();
  await expect(otherPage.getByTestId('response-let-it-slide')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Police Wala Raid opens target picker', async ({ browser }) => {
  const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage } = await createThreePlayerTable(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, playerOnePage, playerTwoPage);

  await activePage.getByTestId('action-button-POLICE_WALA_RAID').click();
  await expect(activePage.getByTestId('target-picker')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: block prompt shows only legal Use Setting roles', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerTable(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, playerOnePage, playerTwoPage);
  const otherPage = activePage === playerOnePage ? playerTwoPage : playerOnePage;

  await activePage.getByTestId('action-button-RISHTEDAAR_HELP').click();
  await expect(otherPage.getByTestId('response-block-MALIK_SAAB')).toBeVisible();
  await expect(otherPage.getByTestId('response-let-it-slide')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Bhai Ka Scene opens target picker', async ({ browser }) => {
  const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage } = await createThreePlayerTable(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, playerOnePage, playerTwoPage);

  await activePage.getByTestId('action-button-BHAI_KA_SCENE').click();
  await expect(activePage.getByTestId('target-picker')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Burn Connection modal requires explicit confirm', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerTable(browser);
  const activeName = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(activeName, playerOnePage, playerTwoPage);
  const targetPage = activePage === playerOnePage ? playerTwoPage : playerOnePage;

  await activePage.getByTestId('action-button-BHAI_KA_SCENE').click();
  await activePage.getByTestId('target-option').last().click();
  await activePage.getByTestId('target-confirm-button').click();
  await expect(targetPage.getByTestId('response-let-it-slide')).toBeVisible();
  await targetPage.getByTestId('response-let-it-slide').click();
  await expect(targetPage.getByTestId('response-let-it-slide')).toBeVisible();
  await targetPage.getByTestId('response-let-it-slide').click();
  await expect(targetPage.getByTestId('burn-modal')).toBeVisible();
  await expect(targetPage.getByRole('button', { name: 'Confirm burn' })).toBeDisabled();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Full Beizzati opens target picker when affordable', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerTable(browser);

  for (let index = 0; index < 12; index += 1) {
    const activeName = await activePlayerName(hostPage);
    const activePage = await pageForActivePlayer(activeName, playerOnePage, playerTwoPage);
    await activePage.getByTestId('action-button-CHAI_PAISA').click();
    await waitForTurnName(hostPage, activeName === 'Ari' ? 'Bea' : 'Ari');
    const rupees = await activePage.getByTestId('private-rupees').textContent();
    if (rupees?.includes('7')) {
      break;
    }
  }

  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, playerOnePage, playerTwoPage);
  await expect(activePage.getByTestId('action-button-FULL_BEIZZATI')).toBeVisible();
  await activePage.getByTestId('action-button-FULL_BEIZZATI').click();
  await expect(activePage.getByTestId('target-picker')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Zardaar Jugaad modal requires exactly two returned Connections', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerTable(browser);
  const activeName = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(activeName, playerOnePage, playerTwoPage);
  const otherPage = activePage === playerOnePage ? playerTwoPage : playerOnePage;

  await activePage.getByTestId('action-button-ZARDAAR_JUGAAD').click();
  await otherPage.getByTestId('response-let-it-slide').click();
  await expect(activePage.getByTestId('jugaad-modal')).toBeVisible();
  await expect(activePage.getByTestId('jugaad-submit-return')).toBeDisabled();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Zardaar Jugaad opens return modal after challenge passes', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerTable(browser);
  const activeName = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(activeName, playerOnePage, playerTwoPage);
  const otherPage = activePage === playerOnePage ? playerTwoPage : playerOnePage;

  await activePage.getByTestId('action-button-ZARDAAR_JUGAAD').click();
  await expect(otherPage.getByTestId('response-let-it-slide')).toBeVisible();
  await otherPage.getByTestId('response-let-it-slide').click();
  await expect(activePage.getByTestId('jugaad-modal')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('visual: opponent hidden Connections render as card backs, not role cards', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext } = await createThreePlayerTable(browser);

  await expect(hostPage.getByTestId('player-hidden-count').locator('.card-stack--hidden')).toHaveCount(4);
  await expect(hostPage.getByTestId('player-revealed-connections').locator('img')).toHaveCount(0);

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('visual: burned Connections render actual role art with burned overlay', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerTable(browser);
  const activeName = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(activeName, playerOnePage, playerTwoPage);
  const targetPage = activePage === playerOnePage ? playerTwoPage : playerOnePage;

  await activePage.getByTestId('action-button-BHAI_KA_SCENE').click();
  await activePage.getByTestId('target-option').last().click();
  await activePage.getByTestId('target-confirm-button').click();
  await expect(targetPage.getByTestId('response-let-it-slide')).toBeVisible();
  await targetPage.getByTestId('response-let-it-slide').click();
  await expect(targetPage.getByTestId('response-let-it-slide')).toBeVisible();
  await targetPage.getByTestId('response-let-it-slide').click();
  await expect(targetPage.getByTestId('burn-modal')).toBeVisible();
  await targetPage.getByTestId('burn-connection-option').first().click();
  await expect(targetPage.getByRole('button', { name: 'Confirm burn' })).toBeEnabled();
  await targetPage.getByRole('button', { name: 'Confirm burn' }).click();
  await expect(hostPage.getByTestId('player-revealed-connections').locator('img')).toHaveCount(3);

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});
});
