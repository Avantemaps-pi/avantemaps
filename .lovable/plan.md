# Fix: stuck forever on "Waiting for Pi Browser approval…"

## What the code reads confirm so far

Three separate defects line up exactly with the video. All three are verified by reading the current files; the timing behaviour will be confirmed by an actual simulated-failure run before/after the fix.

1. **The overlay can never hide after a timeout.**
   `AuthenticatingOverlay` hides only when `appReady && !isLoading`. `AuthProvider.login()` sets `appReady = false` at the start, and `appReady = true` only on the normal completion path. Its 120s watchdog callback sets `isLoading = false`, sets `authError`, and fires a toast — but never sets `appReady = true`. So when the watchdog is the thing that fires, the full-screen overlay stays mounted permanently. That is an indefinite stick, not a 2-minute one.

2. **A hung `Pi.authenticate()` is retried, so the real error is minutes away.**
   `performLogin`'s inner timeout (120s) rejects, and the rejection lands in the retry loop, which retries up to 2 more times with a fresh 120s timer each — roughly 6 minutes before `setAuthError` / the error toast ever runs. A timeout is not a retryable condition here.

3. **The overlay is error-blind and its progress is fake.**
   Progress is a time-based counter capped at 90%; the overlay never reads `authError`. Even a perfectly working timeout would only silently remove the overlay, and its `fixed inset-0 z-50` surface can sit over the toast layer.

## Reproduction (before writing any fix)

Playwright against the running app, in a script under `/tmp/browser/`:
- block the real `pi-sdk.js`, stub `window.Pi` with an `authenticate()` returning a promise that never settles, and mark the SDK initialised so the flow proceeds past the Pi Browser checks (same technique as `tests/e2e/reauth-false-success.spec.ts`);
- trigger login from the login dialog, then poll for ~140s recording: overlay visibility, the overlay's message text, whether any error toast is present, and the auth context's `isLoading` / `authError` / `appReady`.

This tells us definitively which of the failure modes above the user is hitting, and gives a before screenshot.

## Fix

**Root cause — auth state must always settle**
- In `AuthProvider.login()`, the watchdog callback also sets `appReady = true` (and clears `pendingAuthRef`, as it already does) so no failure path can leave the overlay latched on.
- Make the same guarantee structural: the `finally` block sets `appReady = true` too, so every exit path (throw, early return, watchdog) ends with a settled state.
- In `performLogin`, treat a timeout / cancellation as terminal: do not re-enter the retry loop for it. Surface `authError` + toast immediately instead of after ~6 minutes.
- Lower the hung-authenticate ceiling to a value that still allows real human approval in Pi Browser but fails visibly much sooner (60s), and show a "taking longer than usual" state with a Cancel action at ~20s so a genuinely hung handshake is actionable almost immediately.

**Overlay — surface errors**
- `AuthenticatingOverlay` also reads `authError`. When it is non-null, the overlay immediately swaps the fake progress skeleton for an error state: the real message, a **Try again** button (calls `login()`), and a **Dismiss** button (clears the error / closes the overlay) — regardless of `isLoading`.
- Add the "still waiting" hint + Cancel affordance for the pre-error slow case, so the user is never watching a frozen 90% bar with no way out.
- Raise the sonner toaster above the overlay (or rely on the in-overlay error copy) so the message is never hidden behind the fixed layer.

## Verification

Re-run the same simulated-hung-`authenticate()` script and confirm: the overlay shows a real, readable error with working Try again / Dismiss well inside the window (target ~60s, with the Cancel affordance at ~20s), `isLoading` returns to false, `appReady` returns to true, and the overlay is dismissible. Screenshot the error state. Also run a normal (non-hung) stub to confirm the happy path still hides the overlay. Build + typecheck clean, no new `any`.

## Technical notes

Files touched: `src/context/auth/AuthProvider.tsx` (watchdog + `finally` settle `appReady`), `src/context/auth/authService.ts` (timeout is terminal, timeout constant lowered, slow-state signal), `src/components/auth/AuthenticatingOverlay.tsx` (error + slow states, retry/dismiss). A `clearAuthError` action is added to the auth context if one is not already exposed. Regression test added under `tests/e2e/` covering "hung Pi authenticate surfaces a visible error and the overlay does not latch".
