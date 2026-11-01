import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'reports/ui-tests.xml' }],
  ],
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    launchOptions: process.env.CI ? {} : { channel: 'chrome' },
    trace: 'retain-on-failure',
  },
});
