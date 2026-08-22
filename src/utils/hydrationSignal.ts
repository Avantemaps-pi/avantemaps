/**
 * App-hydration signal.
 *
 * TanStack Start hydrates the route subtree (behind the root <Suspense>)
 * asynchronously — route modules load while the shell is already committed.
 * Any auth/session state restored from localStorage in a shell-level effect
 * lands BEFORE that subtree hydrates, so React sees server HTML rendered
 * logged-out vs. a client tree rendered logged-in → "Hydration failed".
 *
 * Fix: <AppHydrationSignal /> is rendered inside the root Suspense boundary
 * (sibling of <Outlet />), so its mount effect fires only once the route
 * subtree has hydrated. State restores that would change SSR-visible DOM
 * (cached session restore) wait on this signal via whenAppHydrated().
 */

let hydrated = false;
const listeners: Array<() => void> = [];

export const markAppHydrated = (): void => {
  if (hydrated) return;
  hydrated = true;
  console.log('[hydration-debug] markAppHydrated at', performance.now());
  const pending = listeners.splice(0, listeners.length);
  pending.forEach((cb) => {
    try {
      cb();
    } catch {
      // listener errors must not block other listeners
    }
  });
};

/**
 * Invoke `cb` once the app has hydrated (immediately if it already has).
 * Includes a safety timeout so a failed route load can never leave a
 * returning user stuck logged-out. Returns a cancel function.
 */
export const whenAppHydrated = (cb: () => void, timeoutMs = 3000): (() => void) => {
  if (hydrated || typeof window === 'undefined') {
    cb();
    return () => {};
  }
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cb();
  };
  listeners.push(run);
  const timer = window.setTimeout(() => { console.log('[hydration-debug] TIMEOUT fired at', performance.now()); run(); }, timeoutMs);
  return () => {
    done = true;
    window.clearTimeout(timer);
  };
};
