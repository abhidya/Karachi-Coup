import { expect, test, type Page } from '@playwright/test';
import { activePlayerName, createThreePlayerGame, pageForActivePlayer, pageForPlayerName } from './helpers';

const peerMode = process.env.E2E_PEER_MODE === '1';
const peerDescribe = peerMode ? test.describe : test.describe.skip;

if (peerMode) {
  test.describe.configure({ timeout: 360_000 });
}

async function visiblePageWithTestId(testId: string, pages: Page[], timeoutMs = 4_000) {
  for (const page of pages) {
    try {
      await expect(page.getByTestId(testId).first()).toBeVisible({ timeout: timeoutMs });
      return page;
    } catch {
      // Try the next player view.
    }
  }
  throw new Error(`Could not find a page showing ${testId}.`);
}

async function chooseFirstTarget(page: Page) {
  await expect(page.getByTestId('target-picker')).toBeVisible();
  const targetOption = page.getByTestId('target-option').first();
  const targetName = (await targetOption.locator('strong').textContent())?.trim();
  if (!targetName) throw new Error('Target picker did not expose a target name.');

  await targetOption.click();
  await expect(page.getByTestId('target-confirm-button')).toBeEnabled();
  await page.getByTestId('target-confirm-button').click();
  return targetName;
}

async function burnFirstConnection(page: Page) {
  await expect(page.getByTestId('burn-modal')).toBeVisible({ timeout: 12_000 });
  await page.getByTestId('burn-connection-option').first().click();
  await expect(page.getByRole('button', { name: 'Confirm burn' })).toBeEnabled();
  await page.getByRole('button', { name: 'Confirm burn' }).click();
}

peerDescribe('full game simulation', () => {
  test('plays from room creation through winner declaration using legal UI actions', async ({ browser }) => {
    const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage } =
      await createThreePlayerGame(browser);
    const pages = [hostPage, playerOnePage, playerTwoPage];

    try {
      const turnHistory: string[] = [];
      const burnHistory: string[] = [];

      for (let turn = 0; turn < 80; turn += 1) {
        if (await hostPage.getByTestId('game-over-screen').isVisible().catch(() => false)) break;

        const name = await activePlayerName(hostPage);
        turnHistory.push(name);
        const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
        const fullBeizzati = activePage.getByTestId('action-button-FULL_BEIZZATI');

        if (await fullBeizzati.isVisible().catch(() => false)) {
          await fullBeizzati.click();
          const targetName = await chooseFirstTarget(activePage);
          burnHistory.push(`${name}->${targetName}`);
          const targetPage = await pageForPlayerName(targetName, hostPage, playerOnePage, playerTwoPage);
          const burnPage = await visiblePageWithTestId('burn-modal', [targetPage, ...pages.filter((page) => page !== targetPage)]);
          await burnFirstConnection(burnPage);

          if (await hostPage.getByTestId('game-over-screen').isVisible({ timeout: 2_000 }).catch(() => false)) break;
          await expect(hostPage.getByTestId('active-player-name').first()).not.toHaveText(name, { timeout: 12_000 });
          continue;
        }

        await activePage.getByTestId('action-button-CHAI_PAISA').click();
        await expect(hostPage.getByTestId('active-player-name').first()).not.toHaveText(name, { timeout: 12_000 });
      }

      await expect(hostPage.getByTestId('game-over-screen')).toBeVisible({ timeout: 15_000 });
      await expect(hostPage.getByTestId('winner-name')).toBeVisible();
      await expect(hostPage.getByTestId('winner-name')).not.toHaveText('');
      await expect(hostPage.getByTestId('public-player-row')).toHaveCount(3);
      expect(burnHistory.length, `burns: ${burnHistory.join(', ')}; turns: ${turnHistory.join(' -> ')}`).toBeGreaterThanOrEqual(4);
    } finally {
      await hostContext.close();
      await playerOneContext.close();
      await playerTwoContext.close();
    }
  });
});
