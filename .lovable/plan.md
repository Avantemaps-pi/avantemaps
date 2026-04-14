

## Plan: Lighten the Sidebar Navigation

The sidebar currently shows 8 navigation items, many of which duplicate the bottom nav bar (Map, Recommendations, Bookmarks, Notifications, Settings). This makes it feel cluttered and "heavy."

### Changes

**1. Remove items already in the bottom nav bar from the sidebar**

The bottom nav already has: Map, Explore (Recommendations), Saved (Bookmarks), Alerts (Notifications), Settings.

The sidebar will keep only items NOT in the bottom nav:
- Registered Business
- CommuniCon
- About Us
- Admin-only items (Templates, Bulk Notifications, A/B Testing, Frequency Caps)

**2. Visually lighten the sidebar nav items**

- Reduce icon size from `h-5 w-5` to `h-4 w-4`
- Reduce vertical padding from `py-2` to `py-1.5`
- Use smaller text size (`text-sm`)

**3. Clean up the footer section**

- Simplify the footer: keep just legal links and copyright in a single compact block
- Move "Contact Us" and "Email Support" buttons into a simpler text-link style

### Files to modify

- `src/components/layout/sidebar/sidebarConfig.ts` -- remove Map, Recommendations, Bookmarks, Notifications, Settings from `navItems`
- `src/components/layout/sidebar/NavItem.tsx` -- reduce icon/text size and padding
- `src/components/layout/sidebar/MobileSidebar.tsx` -- simplify footer section

### Result

The sidebar becomes a complementary menu for secondary pages (Registered Business, CommuniCon, About Us) rather than duplicating the primary bottom nav. This makes it feel much lighter and purposeful.

