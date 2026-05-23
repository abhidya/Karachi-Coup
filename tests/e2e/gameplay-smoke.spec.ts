import { expect, test } from '@playwright/test';
import { activePlayerName, createThreePlayerGame, pageForActivePlayer, pageForPlayerName, waitForTurnName } from './helpers';

const peerMode = process.env.E2E_PEER_MODE === '1';
const peerDescribe = peerMode ? test.describe : test.describe.skip;

if (peerMode) {
  test.describe.configure({ timeout: 240_000 });
}

async function selectFirstTarget(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('target-picker')).toBeVisible();
  const targetOption = page.getByTestId('target-option').first();
  const targetName = (await targetOption.locator('strong').textContent())?.trim() ?? '';
  await targetOption.click();
  await expect(page.getByTestId('target-confirm-button')).toBeEnabled();
  await page.getByTestId('target-confirm-button').click();
  return targetName;
}

async function visiblePageWithTestId(testId: string, pages: Array<import('@playwright/test').Page>, timeoutMs = 2500) {
  for (const page of pages) {
    try {
      await expect(page.getByTestId(testId).first()).toBeVisible({ timeout: timeoutMs });
      return page;
    } catch {
      // Try the next page.
    }
  }
  throw new Error(`Could not find a page showing ${testId}.`);
}

peerDescribe('gameplay smoke', () => {
test('visual: game screen shows current scene, your move, private hand, public table, and action log', async ({ browser }) => {
  const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);

  await expect(activePage.getByTestId('current-scene')).toBeVisible();
  await expect(activePage.getByTestId('private-panel')).toBeVisible();
  await expect(activePage.getByTestId('public-player-table')).toBeVisible();
  await expect(activePage.getByTestId('action-log')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: active player can take Chai Paisa and rupees update', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);

  await activePage.getByTestId('action-button-CHAI_PAISA').click();
  await waitForTurnName(hostPage, name === 'Ari' ? 'Bea' : 'Ari');
  await expect(activePage.getByTestId('private-panel')).toContainText('3₹');

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Kiraya Collection does not open target picker', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);

  await activePage.getByTestId('action-button-KIRAYA_COLLECTION').click();
  await expect(activePage.getByTestId('target-picker')).toHaveCount(0);

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: challenge prompt shows Call Bakwaas and Let It Slide', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  const otherPage = activePage === playerOnePage ? playerTwoPage : playerOnePage;

  await activePage.getByTestId('action-button-KIRAYA_COLLECTION').click();
  await expect(otherPage.getByTestId('response-call-bakwaas')).toBeVisible();
  await expect(otherPage.getByTestId('response-let-it-slide')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Police Wala Raid opens target picker', async ({ browser }) => {
  const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);

  await activePage.getByTestId('action-button-POLICE_WALA_RAID').click();
  await expect(activePage.getByTestId('target-picker')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: block prompt shows only legal Use Setting roles', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  const otherPage = activePage === playerOnePage ? playerTwoPage : playerOnePage;

  await activePage.getByTestId('action-button-RISHTEDAAR_HELP').click();
  await expect(otherPage.getByTestId('response-block-MALIK_SAAB')).toBeVisible();
  await expect(otherPage.getByTestId('response-let-it-slide')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Bhai Ka Scene opens target picker', async ({ browser }) => {
  const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  const name = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);

  await activePage.getByTestId('action-button-BHAI_KA_SCENE').click();
  await expect(activePage.getByTestId('target-picker')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Burn Connection modal requires explicit confirm', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  const activeName = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);

  await activePage.getByTestId('action-button-BHAI_KA_SCENE').click();
  const targetName = await selectFirstTarget(activePage);
  const responderPage = await pageForPlayerName(targetName, hostPage, playerOnePage, playerTwoPage);
  await expect(responderPage.getByTestId('response-block-MUMMA')).toBeVisible({ timeout: 10_000 });
  await expect(responderPage.getByTestId('response-let-it-slide')).toBeVisible();
  await responderPage.getByTestId('response-let-it-slide').click();
  const burnPage = await visiblePageWithTestId('burn-modal', [hostPage, playerOnePage, playerTwoPage]);
  await expect(burnPage.getByRole('button', { name: 'Confirm burn' })).toBeDisabled();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Full Beizzati opens target picker when affordable', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);

  const nextTurnName = (name: string) => (name === 'Host One' ? 'Ari' : name === 'Ari' ? 'Bea' : 'Host One');
  let expectedActiveName = await activePlayerName(hostPage);

  for (let index = 0; index < 15; index += 1) {
    const activePage = await pageForActivePlayer(expectedActiveName, hostPage, playerOnePage, playerTwoPage);
    await activePage.getByTestId('action-button-CHAI_PAISA').click();
    expectedActiveName = nextTurnName(expectedActiveName);
    await waitForTurnName(hostPage, expectedActiveName);
  }

  const name = expectedActiveName;
  const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  await expect(activePage.getByTestId('action-button-FULL_BEIZZATI')).toBeVisible();
  await activePage.getByTestId('action-button-FULL_BEIZZATI').click();
  await expect(activePage.getByTestId('target-picker')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Zardaar Jugaad modal requires exactly two returned Connections', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  const activeName = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);

  await activePage.getByTestId('action-button-ZARDAAR_JUGAAD').click();
  const firstResponderPage = await visiblePageWithTestId('response-let-it-slide', [hostPage, playerOnePage, playerTwoPage].filter((page) => page !== activePage));
  await firstResponderPage.getByTestId('response-let-it-slide').click();
  const secondResponderPage = await visiblePageWithTestId('response-let-it-slide', [hostPage, playerOnePage, playerTwoPage].filter((page) => page !== activePage && page !== firstResponderPage));
  await secondResponderPage.getByTestId('response-let-it-slide').click();
  await expect(activePage.getByTestId('jugaad-modal')).toBeVisible();
  await expect(activePage.getByTestId('jugaad-submit-return')).toBeDisabled();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('gameplay: Zardaar Jugaad opens return modal after challenge passes', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  const activeName = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);

  await activePage.getByTestId('action-button-ZARDAAR_JUGAAD').click();
  const firstResponderPage = await visiblePageWithTestId('response-let-it-slide', [hostPage, playerOnePage, playerTwoPage].filter((page) => page !== activePage));
  await firstResponderPage.getByTestId('response-let-it-slide').click();
  const secondResponderPage = await visiblePageWithTestId('response-let-it-slide', [hostPage, playerOnePage, playerTwoPage].filter((page) => page !== activePage && page !== firstResponderPage));
  await secondResponderPage.getByTestId('response-let-it-slide').click();
  await expect(activePage.getByTestId('jugaad-modal')).toBeVisible();

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('visual: opponent hidden Connections render as card backs, not role cards', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext } = await createThreePlayerGame(browser);

  await expect(hostPage.getByTestId('player-hidden-count').locator('.card-stack--hidden')).toHaveCount(6);
  await expect(hostPage.getByTestId('player-revealed-connections').locator('img')).toHaveCount(0);

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});

test('visual: burned Connections render actual role art with burned overlay', async ({ browser }) => {
  const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  const activeName = await activePlayerName(hostPage);
  const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);

  await activePage.getByTestId('action-button-BHAI_KA_SCENE').click();
  const targetName = await selectFirstTarget(activePage);
  const responderPage = await pageForPlayerName(targetName, hostPage, playerOnePage, playerTwoPage);
  await expect(responderPage.getByTestId('response-block-MUMMA')).toBeVisible({ timeout: 10_000 });
  await expect(responderPage.getByTestId('response-let-it-slide')).toBeVisible();
  await responderPage.getByTestId('response-let-it-slide').click();
  const burnPage = await visiblePageWithTestId('burn-modal', [hostPage, playerOnePage, playerTwoPage]);
  await burnPage.getByTestId('burn-connection-option').first().click();
  await expect(burnPage.getByRole('button', { name: 'Confirm burn' })).toBeEnabled();
  await burnPage.getByRole('button', { name: 'Confirm burn' }).click();
  await expect(hostPage.getByTestId('player-revealed-connections').locator('img')).toHaveCount(3);

  await hostContext.close();
  await playerOneContext.close();
  await playerTwoContext.close();
});
});
