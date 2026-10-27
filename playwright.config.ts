import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for end-to-end / perf tests.
 *
 * By default we target the local Vite dev server at http://localhost:8080.
 * To run against the deployed preview, set PREVIEW_URL, e.g.:
 *   PREVIEW_URL=https://avantemaps.lovable.app bun playwright test
 */
const baseURL = process.env.PREVIEW_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: './tests/e2e',
  // A stuck test fails after 60s; a stuck run (or server) fails after 20 minutes
  // instead of hanging. The full suite takes about 13 minutes.
  timeout: 60_000,
  globalTimeout: 20 * 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // The html report is written but never served, so nothing waits for Ctrl+C
  reporter: [['list'], ['html', { open: 'never' }]],
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
