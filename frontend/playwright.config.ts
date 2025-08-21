// @ts-nocheck
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  retries: 0,
  // ヘッドあり時は順次実行（1ワーカー、非並列）
  fullyParallel: process.env.PW_HEADED ? false : true,
  workers: process.env.PW_HEADED ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost',
    headless: process.env.PW_HEADED ? false : true,
    launchOptions: {
      slowMo: process.env.PW_SLOWMO ? Number(process.env.PW_SLOWMO) : 0,
    },
    trace: process.env.PW_TRACE || 'on-first-retry',
    screenshot: process.env.PW_SCREENSHOT || 'only-on-failure',
    video: (process.env.PW_VIDEO as 'on' | 'off' | 'retain-on-failure' | 'on-first-retry') || 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});


