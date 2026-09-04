/**
 * Regression/telemetry test for the Pi.authenticate() 60s timeout path in
 * performLogin() (src/context/auth/authService.ts, PI_AUTH_TIMEOUT_MS).
 *
 * Production incident this covers: multiple users are hitting the
 * "Pi Network didn't respond" timeout with retry not resolving it, and the
 * only diagnostic signal used to be secureLogger's console output — invisible
 * to us once it happens in someone else's browser. authService.ts records a
 * 'pi_auth_timeout' telemetry event the moment the 60s watchdog fires (and
 * 'pi_auth_resolved' when Pi.authenticate() succeeds), so we can tell
 * server-side whether Pi.authenticate() is hanging vs. failing fast.
 *
 * pi_auth_timeout / pi_auth_resolved / pi_auth_error fire from inside
 * performLogin() before supabase.auth.setSession() is ever reached, at a
 * point where the Supabase client structurally has no authenticated-role
 * session — confirmed directly against reauth_telemetry's RLS (it's
 * `TO authenticated` only; SET LOCAL ROLE anon -> 42501). The normal
 * client-side insert() can never pass RLS for these three event types, on any
 * platform, so recordReauthEvent() (reauthTelemetry.ts) routes them
 * exclusively through supabase/functions/telemetry-beacon via
 * navigator.sendBeacon() instead, which inserts with the service role key.
 * This test asserts both halves of that: the beacon request actually fires,
 * and — just as importantly — no direct insert to reauth_telemetry is ever
 * attempted for this event type (it would be wasted, since it cannot succeed).
 *
 * This test simulates a hung Pi.authenticate() call (mirrors the window.Pi
 * stubbing pattern from reauth-false-success.spec.ts, but the stub's
 * authenticate() never resolves or rejects instead of rejecting immediately).
 */
import { test, expect } from '@playwright/test';

// Generous budget: the 60s PI_AUTH_TIMEOUT_MS watchdog only starts once
// requestAuthPermissions + the SDK-ready checks have run, so wall-clock time
// from button click to the recorded event can run somewhat past 60s.
test.setTimeout(150_000);

test('hung Pi.authenticate() records exactly one pi_auth_timeout event via the beacon path, never the direct insert', async ({
  page,
}) => {
  const beaconPayloads: any[] = [];
  const directInsertAttempts: string[] = [];

  // Intercept the beacon edge function so this test never writes to the real
  // production table — just observes what recordReauthEvent() would have sent.
  await page.route('**/functions/v1/telemetry-beacon**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      beaconPayloads.push(body);
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    } else {
      await route.continue();
    }
  });

  // pi_auth_timeout must NEVER attempt the direct insert path (it's beacon-only
  // now) — track any attempt so it fails the test rather than silently passing.
  await page.route('**/rest/v1/reauth_telemetry**', async (route) => {
    if (route.request().method() === 'POST') {
      directInsertAttempts.push(route.request().url());
    }
    await route.continue();
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
  // beacon payload itself rather than pin down one specific element.
  await expect
    .poll(() => beaconPayloads.some((row) => row?.event_type === 'pi_auth_timeout'), {
      timeout: 120_000,
    })
    .toBe(true);

  // Exactly one pi_auth_timeout event, with sensible metadata, tagged as
  // beacon-sourced.
  const timeoutEvents = beaconPayloads.filter((row) => row?.event_type === 'pi_auth_timeout');
  expect(timeoutEvents).toHaveLength(1);

  const [event] = timeoutEvents;
  expect(event.metadata.paymentCallbackFired).toBe(false);
  expect(event.metadata.piPresent).toBe(true);
  expect(event.metadata.piAuthenticateIsFunction).toBe(true);
  expect(event.metadata.elapsedMs).toBeGreaterThanOrEqual(59_000);
  expect(event.metadata.elapsedMs).toBeLessThan(75_000);
  expect(event.is_retry).toBe(false);

  // No spurious success/error events for this hung attempt.
  expect(beaconPayloads.filter((row) => row?.event_type === 'pi_auth_resolved')).toHaveLength(0);
  expect(beaconPayloads.filter((row) => row?.event_type === 'pi_auth_error')).toHaveLength(0);

  // The direct insert path must never be attempted for pi_auth_timeout — it
  // is beacon-only, since it structurally cannot pass reauth_telemetry's RLS.
  expect(directInsertAttempts).toHaveLength(0);
});
