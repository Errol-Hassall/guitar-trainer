import { existsSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

// Prefer the system Chromium; fall back to Playwright's own browser.
const systemChromium = '/usr/bin/chromium'
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  (existsSync(systemChromium) ? systemChromium : undefined)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: '.test-data/playwright-artifacts',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    locale: 'en-GB',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
  },
  webServer: {
    command:
      'rm -rf .test-data/e2e && bun run build && ' +
      'PORT=3100 HOST=127.0.0.1 DATABASE_PATH=.test-data/e2e/test.db bun .output/server/index.mjs',
    url: 'http://127.0.0.1:3100',
    timeout: 240_000,
    reuseExistingServer: false,
    env: { TZ: 'UTC' },
  },
})
