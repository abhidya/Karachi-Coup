import { devices, expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { hostStorageKey } from '../../src/network/storage';
import { activePlayerName, createHostedRoom, createThreePlayerGame, joinRoom, pageForActivePlayer, pageForPlayerName, startGame } from './helpers';

const peerMode = process.env.E2E_PEER_MODE === '1';
const peerDescribe = peerMode ? test.describe : test.describe.skip;

if (peerMode) {
  test.describe.configure({ timeout: 360_000 });
}

type Participant = {
  name: string;
  page: Page;
  context: BrowserContext;
};

const fiveJoinedClientProfiles = [
  { name: 'Ari', device: devices['Desktop Chrome'] },
  { name: 'Bea', device: devices['Pixel 5'] },
  { name: 'Cyrus', device: devices['iPhone 13'] },
  { name: 'Dina', device: devices['Desktop Edge'] },
  { name: 'Eshan', device: devices['iPad Pro 11'] },
] as const;

function normalizePlayerName(name: string) {
  return name.trim().toLowerCase();
}

function pageForParticipant(playerName: string, participants: Participant[]) {
  const normalized = normalizePlayerName(playerName);
  const participant = participants.find(({ name }) => normalized.includes(normalizePlayerName(name)));
  if (!participant) {
    throw new Error(`Could not map active player "${playerName}" to a browser page.`);
  }
  return participant.page;
}

async function createSixPlayerGame(browser: Browser) {
  const participants: Participant[] = [];

  try {
    const hostContext = await browser.newContext({ ...devices['Desktop Chrome'] });
    const hostPage = await hostContext.newPage();
    participants.push({ name: 'Host One', context: hostContext, page: hostPage });

    const roomCode = await createHostedRoom(hostPage, 'Host One');
    const storageKey = hostStorageKey(roomCode);

    for (const profile of fiveJoinedClientProfiles) {
      const context = await browser.newContext({ ...profile.device });
      const page = await context.newPage();
      participants.push({ name: profile.name, context, page });

      await joinRoom(page, roomCode, profile.name);
      await expect
        .poll(async () => hostPage.evaluate((key) => window.localStorage.getItem(key), storageKey), {
          message: `${profile.name} should appear in host storage`,
          timeout: 30_000,
        })
        .toContain(profile.name);
    }

    for (const { name } of participants) {
      await expect(hostPage.locator('body'), `${name} should be listed on the host before start`).toContainText(name, { timeout: 30_000 });
    }
    await startGame(hostPage, roomCode);

    for (const { page, name } of participants) {
      await expect(page, `${name} should enter the game route`).toHaveURL(new RegExp(`#\\/game\\?room=${roomCode}`), { timeout: 45_000 });
      await expect(page.getByTestId('active-player-name').first(), `${name} should receive active-player state`).toBeVisible({ timeout: 45_000 });
    }

    return { roomCode, participants };
  } catch (error) {
    await Promise.allSettled(participants.map(({ context }) => context.close()));
    throw error;
  }
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

        if (await fullBeizzati.isEnabled().catch(() => false)) {
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

  test('plays a full game at the six-player room cap', async ({ browser }) => {
    test.setTimeout(900_000);

    const { participants } = await createSixPlayerGame(browser);
    const hostPage = participants[0]!.page;
    const pages = participants.map(({ page }) => page);

    try {
      const turnHistory: string[] = [];
      const burnHistory: string[] = [];

      for (let turn = 0; turn < 260; turn += 1) {
        if (await hostPage.getByTestId('game-over-screen').isVisible().catch(() => false)) break;

        const name = await activePlayerName(hostPage);
        turnHistory.push(name);
        const activePage = pageForParticipant(name, participants);
        await expect(activePage.getByTestId('player-decision-panel')).toBeVisible({ timeout: 20_000 });

        const fullBeizzati = activePage.getByTestId('action-button-FULL_BEIZZATI');
        if (await fullBeizzati.isEnabled().catch(() => false)) {
          await fullBeizzati.click();
          const targetName = await chooseFirstTarget(activePage);
          burnHistory.push(`${name}->${targetName}`);
          const targetPage = pageForParticipant(targetName, participants);
          const burnPage = await visiblePageWithTestId('burn-modal', [targetPage, ...pages.filter((page) => page !== targetPage)], 6_000);
          await burnFirstConnection(burnPage);

          if (await hostPage.getByTestId('game-over-screen').isVisible({ timeout: 5_000 }).catch(() => false)) break;
          await expect(hostPage.getByTestId('active-player-name').first()).not.toHaveText(name, { timeout: 20_000 });
          continue;
        }

        const chaiPaisa = activePage.getByTestId('action-button-CHAI_PAISA');
        await expect(chaiPaisa).toBeEnabled({ timeout: 20_000 });
        await chaiPaisa.click();
        await expect(hostPage.getByTestId('active-player-name').first()).not.toHaveText(name, { timeout: 20_000 });
      }

      await expect(hostPage.getByTestId('game-over-screen')).toBeVisible({ timeout: 30_000 });
      await expect(hostPage.getByTestId('winner-name')).toBeVisible();
      await expect(hostPage.getByTestId('winner-name')).not.toHaveText('');
      await expect(hostPage.getByTestId('public-player-row')).toHaveCount(6);
      expect(burnHistory.length, `burns: ${burnHistory.join(', ')}; turns: ${turnHistory.join(' -> ')}`).toBeGreaterThanOrEqual(10);
    } finally {
      await Promise.allSettled(participants.map(({ context }) => context.close()));
    }
  });
});
