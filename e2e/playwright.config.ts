import { defineConfig, devices } from '@playwright/test'

/**
 * Browser tests on a phone-sized screen against the demo build: an in-memory API with sample
 * data, no database and no Google login, so they run the same everywhere, including CI. The
 * real API and database are covered by the integration tests in apps/api.
 *
 * Without Playwright's own Chromium (`npx playwright install chromium`), point it at an
 * installed browser instead, e.g. PLAYWRIGHT_CHANNEL=msedge npm run test:e2e
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], channel: process.env.PLAYWRIGHT_CHANNEL },
    },
  ],
  webServer: {
    command: 'npm run dev:demo',
    cwd: '..',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
