

## Plan: Landing Page Redesign with Auth Gating

### What We're Building

A marketing-first landing page that only unauthenticated users see. Authenticated users go straight to the map. The design follows the uploaded reference image: top bar with logo + profile icon, search bar, value proposition text, map preview image (static, not the real map component), and feature cards at the bottom.

### Auth Gating

In `App.tsx`, the `/` route will use a wrapper component:
- **Authenticated** → renders current `Index` (map) as-is
- **Not authenticated / loading** → renders `LandingPage`

No route changes needed. The map stays at `/`.

### Landing Page Sections (matching the reference image)

1. **Top Bar** -- Avante Maps logo (left) + profile/sign-in icon (right)
2. **Search Bar** -- Styled search input (navigates to map on interaction)
3. **Hero Text** -- "Discover, Explore, and Connect with Businesses Nearby!"
4. **Map Preview** -- A static map illustration/image as background (lightweight, no Leaflet)
5. **Feature Cards** -- Horizontal scrollable row: "Discover Businesses", "Earn Pi Rewards", "Save & Share"
6. **Stats Section** -- Community numbers (businesses registered, users, countries) fetched from Supabase
7. **Problem/Solution** -- Why Avante Maps exists, benefits of using it
8. **Final CTA** -- "Explore the Map" and "Register Your Business" buttons
9. **Bottom Nav** -- Reuse existing `BottomNavBar` on mobile

### Files to Create/Change

| File | Change |
|------|--------|
| `src/pages/LandingPage.tsx` | **New** -- Full landing page component with all sections above. Fetches stats from Supabase. Search bar click/focus navigates to map. CTA buttons trigger login or navigate to `/registration`. |
| `src/pages/Index.tsx` | Wrap with auth check -- if not authenticated, render `LandingPage` instead. Show `PageLoader` skeleton while auth is loading. |
| `src/components/layout/BottomNavBar.tsx` | Update Map nav item: when on landing page and not authenticated, label as "Home" pointing to `/`. |

### Design Details
- Mobile-first (390px viewport), matching the reference image style
- Light blue/sky gradient background for the hero area
- White rounded cards for features
- Icons for each feature card (Store, Pi coin, Bookmark)
- Uses existing Tailwind + shadcn Button/Card components
- No heavy map component loaded -- uses a static decorative map image or CSS gradient
- Smooth, clean layout matching the uploaded mockup

### Stats Data
Will use `supabase.from('businesses').select('*', { count: 'exact', head: true })` for business count. For user/country counts, will use similar count queries or show hardcoded "growing" numbers if RLS blocks anon access, with a note to add an RPC function later for accurate stats.

