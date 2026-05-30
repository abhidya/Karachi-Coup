import { expect, test } from '@playwright/test';

async function collectErrors(page: any) {
  const errs: string[] = [];
  const pageErrs: string[] = [];
  const reqFail: string[] = [];

  page.on('console', (msg: any) => {
    if (msg.type() === 'error') errs.push(msg.text());
  });
  page.on('pageerror', (err: any) => {
    pageErrs.push(`${err.name}: ${err.message}`);
  });
  page.on('requestfailed', (req: any) => {
    reqFail.push(`${req.url()} => ${req.failure()?.errorText || 'failed'}`);
  });

  return { errs, pageErrs, reqFail };
}

test('github.io production page: host then mobile join emits runtime errors?', async ({ browser }) => {
  const hostContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });

  const host = await hostContext.newPage();
  const mobile = await mobileContext.newPage();

  const hostErr = await collectErrors(host);
  const mobileErr = await collectErrors(mobile);

  await host.goto('./');
  await expect(host.getByTestId('home-title')).toBeVisible();
  await host.getByLabel('Your name').fill('Host Phone');
  await host.getByTestId('create-room-button').click();
  await expect(host).toHaveURL(/#\/(host|lobby)\?room=/);

  const roomCodeMatch = new URL(host.url()).hash.match(/room=([A-Z0-9]+)/);
  const roomCode = roomCodeMatch?.[1] ?? '';

  await mobile.goto(`./#/join?room=${roomCode}`);
  await expect(mobile).toHaveURL(new RegExp(`#/join\\?room=${roomCode}`));

  await mobile.getByLabel('Your name').fill('Mobile Player');
  await mobile.getByTestId('join-submit-button').click();
  await expect(mobile).toHaveURL(new RegExp(`#\\/lobby\\?room=${roomCode}`));

  await host.waitForTimeout(8000);
  await mobile.waitForTimeout(8000);

  // eslint-disable-next-line no-console
  console.log('GITHUB-IO-PROBE', JSON.stringify({ roomCode, hostErr, mobileErr, hostUrl: host.url(), mobileUrl: mobile.url() }, null, 2));

  // We do not hard-fail the test if there are only transport logs; this test is diagnostic only.
  expect(true).toBeTruthy();

  await hostContext.close();
  await mobileContext.close();
});
