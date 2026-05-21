import { expect, test } from '@playwright/test';
import { activePlayerName, createThreePlayerTable, pageForActivePlayer, waitForTurnName } from './helpers';

const peerMode = process.env.E2E_PEER_MODE === '1';
const peerDescribe = peerMode ? test.describe : test.describe.skip;

peerDescribe('gameplay smoke', () => {
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

test('gameplay: Burn Connection modal only appears for the player who must burn', async ({ browser }) => {
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

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});
});
