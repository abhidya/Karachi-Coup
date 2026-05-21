import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.E2E_PORT ?? '4181';
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${e2ePort}/Karachi-Coup/`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command:
          `npm run build && rm -rf /private/tmp/kc-e2e-root && mkdir -p /private/tmp/kc-e2e-root && cp -R "$PWD/dist" /private/tmp/kc-e2e-root/Karachi-Coup && python3 -m http.server ${e2ePort} -d /private/tmp/kc-e2e-root`,
        url: `http://127.0.0.1:${e2ePort}/Karachi-Coup/`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
