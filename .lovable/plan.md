

# UI Improvement Recommendations

Based on a thorough review of the codebase, here are the most impactful UI improvements:

---

## 1. Add a Bottom Navigation Bar on Mobile

Currently, mobile users must open the hamburger sidebar to navigate between core sections (Map, Recommendations, Bookmarks, Notifications). A persistent bottom tab bar for the 4-5 most-used routes would dramatically improve mobile navigation speed.

**Implementation:**
- Create a `BottomNavBar` component that renders only on mobile (`useIsMobile`)
- Show icons + labels for: Map, Recommendations, Bookmarks, Notifications, Settings
- Highlight the active route
- Render it in `AppLayout` below `<main>`, fixed to the bottom
- Add `pb-16` padding to main content on mobile to prevent overlap

---

## 2. Skeleton Loading States That Match Card Layout

The `RecommendationSkeleton` and Bookmarks skeleton don't match the actual `PlaceCard` structure (title + bookmark above image, then address, description, rating). This causes a jarring layout shift when data loads.

**Implementation:**
- Update `RecommendationSkeleton` to mirror PlaceCard: title row skeleton, then image skeleton, then address, description block, and bottom row (rating + badge + button)
- Reuse the same skeleton in Bookmarks instead of the custom inline skeleton

---

## 3. Empty Desktop Sidebar Header

The `DesktopSidebar` header has an empty `<Link>` with no logo or text -- it renders as blank space. The footer also says "2025" instead of "2026".

**Implementation:**
- Add the Avante Maps logo/icon and app name to the sidebar header
- Update the copyright year to 2026

---

## 4. Improve Page Transition Animations

Currently pages appear instantly with no transition. Adding a subtle fade-in on route changes makes the app feel smoother.

**Implementation:**
- Wrap the `<Suspense>` fallback and route content in a fade-in animation
- Use the existing `animate-fade-in` class on page containers
- Add the animation to `AppLayout`'s `<main>` element

---

## 5. Sticky Search/Filter Bar on Recommendations

On mobile (390px viewport), the search bar and category filters scroll away as the user scrolls down the recommendations list. Making them sticky keeps filtering accessible.

**Implementation:**
- Add `sticky top-16 z-[5] bg-background pb-2` to the search/filter container in `Recommendations.tsx` (top-16 accounts for the 64px header)

---

## Priority Order

| # | Improvement | Impact | Effort |
|---|------------|--------|--------|
| 1 | Bottom navigation bar (mobile) | High | Medium |
| 2 | Matching skeleton loaders | Medium | Low |
| 3 | Fix empty sidebar header + year | Low | Low |
| 4 | Page transition animations | Medium | Low |
| 5 | Sticky search/filters on Recommendations | Medium | Low |

I'd recommend starting with #1 (bottom nav) as it has the biggest UX impact for mobile users, then #5 and #2 as quick wins.

