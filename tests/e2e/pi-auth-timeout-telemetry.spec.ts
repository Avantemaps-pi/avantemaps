/**
 * Regression/telemetry test for the Pi.authenticate() 60s timeout path in
 * performLogin() (src/context/auth/authService.ts, PI_AUTH_TIMEOUT_MS).
 *
 * Production incident this covers: multiple users are hitting the
 * "Pi Network didn't respond" timeout with retry not resolving it, and the
 * only diagnostic signal used to be secureLogger's console output — invisible
 * to us once it happens in someone else's browser. authService.ts now records
 * a 'pi_auth_timeout' telemetry event (via recordReauthEvent /
 * reauth_telemetry) the moment the 60s watchdog fires, and a 'pi_auth_resolved'
 * event when Pi.authenticate() succeeds, so we can tell server-side whether
 * Pi.authenticate() is hanging vs. failing fast for affected users.
 *
 * This test simulates a hung Pi.authenticate() call (mirrors the window.Pi
 * stubbing pattern from reauth-false-success.spec.ts, but the stub's
 * authenticate() never resolves or rejects instead of rejecting immediately)
 * and asserts that exactly one 'pi_auth_timeout' telemetry insert reaches
 * Supabase, with sensible metadata, once the 60s window elapses — without
 * writing to the real reauth_telemetry table (the insert is intercepted and
 * fulfilled locally).
 */
import { test, expect } from '@playwright/test';

// Generous budget: the 60s PI_AUTH_TIMEOUT_MS watchdog only starts once
// requestAuthPermissions + the SDK-ready checks have run, so wall-clock time
// from button click to the recorded event can run somewhat past 60s.
test.setTimeout(150_000);

test('hung Pi.authenticate() records exactly one pi_auth_timeout telemetry event', async ({ page }) => {
  const telemetryInserts: any[] = [];

  // Intercept the reauth_telemetry insert so this test never writes to the
  // real production table — just observes what authService.ts would have sent.
  await page.route('**/rest/v1/reauth_telemetry**', async (route) => {
    if (route.request().method() === 'POST') {
      // supabase-js sends insert([payload]) as a JSON array body, even for a
      // single row — spread it so telemetryInserts holds the row objects
      // themselves, not the wrapping array.
      const body = route.request().postDataJSON();
      telemetryInserts.push(...body);
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    } else {
      await route.continue();
    }
  });

  // Block the real Pi SDK so it can't overwrite the stub below.
  await page.route('**/pi-sdk.js', (route) => route.abort());

  await page.addInitScript(() => {
    // Stub Pi SDK: present and "initialized" (so preflight resolves to 'ok'
    // and the login button is enabled), but authenticate() hangs forever —
    // the "Pi Network never responds" scenario this test exercises.
    (window as unknown as { Pi: object }).Pi = {
      init: () => undefined,
      authenticate: (_scopes: string[], _onIncompletePayment: (p: unknown) => void) =>
        new Promise(() => {
          /* never resolves or rejects */
        }),
    };
    (window as unknown as { __piInitialized: boolean }).__piInitialized = true;
  });

  await page.goto('/');

  // Logged-out root route renders LandingPage, which opens LoginDialog by
  // default (showLogin defaults to true).
  const connectButton = page.getByRole('button', { name: 'Connect with Pi Network' });
  await connectButton.waitFor({ state: 'visible', timeout: 15_000 });
  await expect(connectButton).toBeEnabled({ timeout: 15_000 });
  await connectButton.click();

  // The 60s watchdog (PI_AUTH_TIMEOUT_MS) must fire and surface the existing
  // user-facing error — unchanged by this instrumentation. It shows up in
  // multiple places at once (toast + overlay + dialog), so just wait for the
  // telemetry insert itself rather than pin down one specific element.
  await expect
    .poll(() => telemetryInserts.some((row) => row?.event_type === 'pi_auth_timeout'), {
      timeout: 120_000,
    })
    .toBe(true);

  // Exactly one pi_auth_timeout event, with sensible metadata.
  const timeoutEvents = telemetryInserts.filter((row) => row?.event_type === 'pi_auth_timeout');
  expect(timeoutEvents).toHaveLength(1);

  const [event] = timeoutEvents;
  expect(event.metadata.paymentCallbackFired).toBe(false);
  expect(event.metadata.piPresent).toBe(true);
  expect(event.metadata.piAuthenticateIsFunction).toBe(true);
  expect(event.metadata.elapsedMs).toBeGreaterThanOrEqual(59_000);
  expect(event.metadata.elapsedMs).toBeLessThan(75_000);
  expect(event.is_retry).toBe(false);

  // No spurious success/error events for this hung attempt.
  expect(telemetryInserts.filter((row) => row?.event_type === 'pi_auth_resolved')).toHaveLength(0);
  expect(telemetryInserts.filter((row) => row?.event_type === 'pi_auth_error')).toHaveLength(0);
});
