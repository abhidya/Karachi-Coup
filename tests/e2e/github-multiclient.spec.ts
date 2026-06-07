import { devices, expect, test, type Page } from '@playwright/test';

type RuntimeLog = {
  console: string[];
  pageErrors: string[];
  requestFailures: string[];
  crashes: string[];
};

const STORM_PATTERNS = [
  /Unexpected response code: 429/i,
  /Re-initiating full connection/i,
  /Peer disconnected from signaling server, reconnecting/i,
];

function attachRuntimeLog(page: Page, label: string): RuntimeLog {
  const log: RuntimeLog = { console: [], pageErrors: [], requestFailures: [], crashes: [] };

  page.on('console', (message) => {
    log.console.push(`[${label}] ${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => {
    log.pageErrors.push(`[${label}] ${error.name}: ${error.message}`);
  });
  page.on('requestfailed', (request) => {
    log.requestFailures.push(`[${label}] ${request.url()} -> ${request.failure()?.errorText || 'failed'}`);
  });
  page.on('crash', () => {
    log.crashes.push(`[${label}] page crashed`);
  });

  return log;
}

function stormMessages(logs: RuntimeLog[]): string[] {
  return logs
    .flatMap((log) => log.console)
    .filter((message) => STORM_PATTERNS.some((pattern) => pattern.test(message)));
}

function consoleErrors(logs: RuntimeLog[]): string[] {
  return logs.flatMap((log) => log.console).filter((message) => /\] error:/i.test(message));
}

async function createHostedRoom(page: Page, hostName: string): Promise<string> {
  await page.goto('./');
  await page.getByLabel('Your name').fill(hostName);
  await page.getByTestId('create-room-button').click();
  await expect(page).toHaveURL(/#\/(host|lobby)\?room=/);

  const roomCode = new URL(page.url()).hash.match(/room=([A-Z0-9]+)/)?.[1];
  if (!roomCode) {
    throw new Error(`Could not read room code from ${page.url()}`);
  }
  await expect(page.getByTestId('current-scene')).toBeVisible();
  return roomCode;
}

async function joinHostedRoom(page: Page, roomCode: string, playerName: string): Promise<void> {
  await page.goto(`./#/join?room=${roomCode}`);
  await page.getByLabel('Your name').fill(playerName);
  await page.getByTestId('join-submit-button').click();
  await expect(page).toHaveURL(new RegExp(`#\\/lobby\\?room=${roomCode}`));
  await expect(page.getByTestId('current-scene')).toBeVisible();
}

test('production multi-client lobby does not reconnect-storm while waiting', async ({ browser }) => {
  test.setTimeout(120_000);

  const hostContext = await browser.newContext({ ...devices['Desktop Chrome'] });
  const pixelContext = await browser.newContext({ ...devices['Pixel 5'] });
  const iphoneContext = await browser.newContext({ ...devices['iPhone 13'] });

  const hostPage = await hostContext.newPage();
  const pixelPage = await pixelContext.newPage();
  const iphonePage = await iphoneContext.newPage();

  const logs = [
    attachRuntimeLog(hostPage, 'host'),
    attachRuntimeLog(pixelPage, 'pixel'),
    attachRuntimeLog(iphonePage, 'iphone'),
  ];

  try {
    const roomCode = await createHostedRoom(hostPage, 'Host Chrome');
    await joinHostedRoom(pixelPage, roomCode, 'Pixel Player');
    await joinHostedRoom(iphonePage, roomCode, 'iPhone Player');

    await expect(hostPage.locator('body')).toContainText('Pixel Player', { timeout: 60_000 });
    await expect(hostPage.locator('body')).toContainText('iPhone Player', { timeout: 60_000 });
    await expect(pixelPage.locator('body')).toContainText('Host Chrome', { timeout: 60_000 });
    await expect(iphonePage.locator('body')).toContainText('Host Chrome', { timeout: 60_000 });

    for (const page of [pixelPage, iphonePage]) {
      for (let index = 0; index < 3; index += 1) {
        await page.getByTestId('request-resync-button').click();
      }
    }

    await hostPage.waitForTimeout(10_000);

    for (const page of [hostPage, pixelPage, iphonePage]) {
      await expect(page.locator('body')).not.toContainText('CLIENT:ERROR');
      await expect(page.locator('body')).not.toContainText('HOST:ERROR');
      await expect(page.getByTestId('current-scene')).toContainText('Waiting for players.');
    }

    expect(stormMessages(logs)).toEqual([]);
    expect(consoleErrors(logs)).toEqual([]);
    expect(logs.flatMap((log) => log.pageErrors)).toEqual([]);
    expect(logs.flatMap((log) => log.crashes)).toEqual([]);
  } finally {
    await hostContext.close();
    await pixelContext.close();
    await iphoneContext.close();
  }
});
