/**
 * SSR-safe accessors for browser location values.
 * These return empty strings on the server so render-time string building
 * (e.g. share/OG URLs) never throws "window is not defined" during SSR.
 * For render-accurate route checks, prefer useLocation() from router-compat.
 */
export const getOrigin = (): string =>
  typeof window === 'undefined' ? '' : window.location.origin;

export const getPathname = (): string =>
  typeof window === 'undefined' ? '' : window.location.pathname;

export const getHref = (): string =>
  typeof window === 'undefined' ? '' : window.location.href;
