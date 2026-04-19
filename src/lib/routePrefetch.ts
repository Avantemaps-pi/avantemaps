/**
 * Centralized lazy-route loaders so we can both render them via React.lazy
 * AND prefetch them on hover / during idle time.
 *
 * Each entry returns a Promise; calling it more than once is safe because
 * Vite/webpack dynamic imports are de-duplicated and cached.
 */
export const routeLoaders = {
  '/recommendations': () => import('@/pages/Recommendations'),
  '/bookmarks': () => import('@/pages/Bookmarks'),
  '/contact': () => import('@/pages/Contact'),
  '/about': () => import('@/pages/About'),
  '/settings': () => import('@/pages/Settings'),
  '/terms': () => import('@/pages/TermsOfService'),
  '/privacy': () => import('@/pages/PrivacyPolicy'),
  '/cookies': () => import('@/pages/CookiePolicy'),
  '/registration': () => import('@/pages/Registration'),
  '/update-registration': () => import('@/pages/UpdateRegistration'),
  '/communicon': () => import('@/pages/Communicon'),
  '/notifications': () => import('@/pages/Notifications'),
  '/registered-business': () => import('@/pages/RegisteredBusiness'),
  '/verification-info': () => import('@/pages/VerificationInfo'),
  '/review': () => import('@/pages/Review'),
  '/pricing': () => import('@/pages/Pricing'),
  '/analytics': () => import('@/pages/Analytics'),
  '/notification-admin': () => import('@/pages/NotificationAdmin'),
} as const;

export type PrefetchablePath = keyof typeof routeLoaders;

/**
 * Match an arbitrary path (possibly with params) to a known route loader.
 * E.g. '/review/56' -> the '/review' loader.
 */
const findLoader = (path: string) => {
  // Exact match first
  if (path in routeLoaders) {
    return routeLoaders[path as PrefetchablePath];
  }
  // Then prefix match (handles params like /review/:id)
  const match = (Object.keys(routeLoaders) as PrefetchablePath[]).find(
    (key) => path.startsWith(key + '/'),
  );
  return match ? routeLoaders[match] : undefined;
};

/** Trigger a route's chunk download. Safe to call repeatedly. */
export const prefetchRoute = (path: string): void => {
  const loader = findLoader(path);
  if (!loader) return;
  // Fire and forget — errors are handled by the Suspense boundary on click.
  loader().catch(() => {
    /* prefetch failed; navigation will retry */
  });
};

/**
 * Prefetch the most-visited routes during browser idle time so the first
 * navigation feels instant. Skips on slow connections / data-saver mode.
 */
export const prefetchHighPriorityRoutes = (): void => {
  if (typeof window === 'undefined') return;

  const conn = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (conn?.saveData) return;
  if (conn?.effectiveType && /(2g|slow-2g)/.test(conn.effectiveType)) return;

  const priorityPaths: PrefetchablePath[] = [
    '/recommendations',
    '/bookmarks',
    '/registered-business',
    '/settings',
    '/notifications',
  ];

  const run = () => priorityPaths.forEach((p) => prefetchRoute(p));

  const ric = (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;

  if (ric) {
    ric(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1500);
  }
};
