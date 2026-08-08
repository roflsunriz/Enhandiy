// @ts-nocheck
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e',
  globalSetup: './tests-e2e/global-setup.ts',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  retries: 0,
  // E2Eは同じDBとファイル保存領域を変更するため、テスト間の競合を避けて直列実行する。
  fullyParallel: false,
  workers: 1,
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


