/**
 * Regression test for the "stuck on Preparing your map..." bug: a hung
 * window.Pi.authenticate() call (approval never resolves in Pi Browser) left
 * the user staring at AuthenticatingOverlay's fake, time-based progress bar
 * forever, with no visible error — even after the underlying auth attempt
 * timed out and failed.
 *
 * Root cause (fixed upstream of this test): AuthProvider's login() left
 * `appReady` false on every non-happy-path exit (the timeout watchdog, the
 * catch block), which kept AuthenticatingOverlay mounted indefinitely even
 * once `authError` was set. AuthenticatingOverlay also never read `authError`
 * at all, so even a correctly-firing timeout only would have silently removed
 * the overlay with no explanation.
 *
 * This test stubs window.Pi.authenticate() with a promise that never
 * settles — a genuinely hung Pi Browser approval — and asserts that the
 * overlay surfaces a real, actionable error well within the auth timeout
 * window instead of hanging forever.
 *
 * NOTE: PI_AUTH_TIMEOUT_MS (60s in production) is shortened via the
 * VITE_PI_AUTH_TIMEOUT_MS env var for test speed only — see authService.ts.
 * This does not change production behavior; the dev server must be started
 * with this env var set for the test to run in reasonable time, e.g.:
 *   VITE_PI_AUTH_TIMEOUT_MS=3000 ./node_modules/.bin/vite dev
 */
import { test, expect } from '@playwright/test';

test('a hung Pi Browser approval surfaces a visible error instead of hanging forever', async ({ page }) => {
  // Block the real Pi SDK so it can't overwrite the stub below.
  await page.route('**/pi-sdk.js', (route) => route.abort());

  await page.addInitScript(() => {
    // Stub Pi SDK: present and "initialized" (so the real login flow
    // proceeds past all preflight checks), but authenticate() never settles
    // — simulating a Pi Browser approval that the user never completes and
    // the app never hears back from.
    (window as unknown as { Pi: object }).Pi = {
      init: () => undefined,
      authenticate: () => new Promise(() => {}),
    };
    (window as unknown as { __piInitialized: boolean }).__piInitialized = true;
  });

  await page.goto('/');

  // Logged-out users land on LandingPage with the login dialog already open.
  const connectButton = page.getByRole('button', { name: 'Connect with Pi Network' });
  await connectButton.waitFor({ state: 'visible', timeout: 15_000 });
  await connectButton.click();

  // The fake-progress overlay must appear while the (hung) handshake is in flight.
  await expect(page.getByText('Connecting to Pi Network...')).toBeVisible({ timeout: 5_000 });

  // Once the auth timeout fires, the overlay must show a real error with a
  // way out — not keep climbing its fake progress bar forever.
  await expect(page.getByText("Sign-in didn't complete")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dismiss' })).toBeVisible();

  // The fake progress text must not still be showing underneath/instead of the error.
  await expect(page.getByText('Preparing your map...')).toHaveCount(0);
});
