

# Performance and UX Improvement Recommendations

Here are the key areas where we can make meaningful improvements to speed and user experience:

---

## 1. Lazy-load page routes (Code Splitting)

**Problem**: All 20+ pages are eagerly imported in `App.tsx`, meaning the entire app's JavaScript is downloaded upfront — even pages the user never visits.

**Solution**: Use `React.lazy()` + `Suspense` for all routes except the homepage. This can cut the initial bundle size by 40-60%.

**Pages to lazy-load**: Recommendations, Bookmarks, Registration, Settings, Analytics, About, Contact, Pricing, Review, and all admin pages (NotificationTemplates, BulkNotifications, CronSetup, ABTestingDashboard, FrequencyCaps).

---

## 2. Cache business data with React Query instead of raw `useEffect`

**Problem**: `useBusinessData` and `useRecommendations` use raw `useState`/`useEffect` for fetching. Every mount re-fetches from Supabase with no caching, deduplication, or stale-while-revalidate behavior. The Bookmarks page even calls `useBusinessData()` to load ALL businesses just to filter bookmarked ones.

**Solution**: Migrate these hooks to use `@tanstack/react-query` (already installed). This gives automatic caching, background refetching, and request deduplication — so navigating between pages feels instant on revisits.

---

## 3. Optimize image loading in PlaceCard galleries

**Problem**: `SwipeableImageGallery` renders all images upfront. On pages with many cards (Recommendations), this means dozens of off-screen images load simultaneously.

**Solution**:
- Only load the first image initially; lazy-load subsequent gallery images when the user swipes or when the card enters the viewport.
- Add `loading="lazy"` to off-screen `<img>` tags.
- Use placeholder/blur-up technique (already noted as a desired feature in project memory).

---

## 4. Debounce and deduplicate Supabase calls

**Problem**: The `Bookmarks` page loads ALL businesses via `useBusinessData()` just to filter by bookmark IDs. The `Recommendations` page does the same and then adds another RPC call.

**Solution**: Create a dedicated `get_bookmarked_businesses` RPC that accepts bookmark IDs and returns only matching businesses, instead of fetching the entire business table client-side.

---

## 5. Memoize expensive list filtering/sorting

**Problem**: In `Recommendations.tsx`, `sortBusinesses` and `filterBusinesses` run on every render without memoization.

**Solution**: Wrap filtered/sorted results in `useMemo` keyed on the relevant dependencies (search term, selected categories, sort order, source data).

---

## Priority Order

| # | Improvement | Impact | Effort |
|---|------------|--------|--------|
| 1 | Route-based code splitting | High (faster initial load) | Low |
| 2 | React Query for data fetching | High (instant page transitions) | Medium |
| 3 | Lazy image loading in galleries | Medium (less bandwidth) | Low |
| 4 | Dedicated bookmarks RPC | Medium (less data transfer) | Medium |
| 5 | Memoize list operations | Low-Medium (smoother UI) | Low |

I'd recommend starting with #1 (code splitting) and #3 (lazy images) since they're low-effort, high-impact wins, then moving to #2 for the biggest UX improvement.

