import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for end-to-end / perf tests.
 *
 * By default we target the local Vite dev server at http://localhost:5173.
 * To run against the deployed preview, set PREVIEW_URL, e.g.:
 *   PREVIEW_URL=https://avantemaps.lovable.app bun playwright test
 */
const baseURL = process.env.PREVIEW_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    // Keep the cache enabled — that is exactly what we are measuring.
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
