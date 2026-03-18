

## Plan: Replace Map Homepage PlaceCard with Bottom Sheet

**Scope**: Only the map page (`/`) — when a marker is tapped, show a draggable bottom sheet instead of the current centered popup overlay. No changes to PlaceCard usage on Bookmarks or Recommendations pages.

### Files to Change

**1. `src/components/map/map-components/PlaceOverlay.tsx`** — Full rewrite
- Replace the fixed overlay + centered popup with a `Drawer` (vaul) component
- Use `open={showPopover}`, `onOpenChange` to dismiss
- Snap points `[0.4, 1]` for peek (40%) and full expand
- Drawer content: inline the place card content (image gallery, title, rating, address, description, category, details, website button)

**2. `src/components/map/PlaceCardPopup.tsx`** — No changes (keep as-is for potential reuse elsewhere)

**3. `src/styles/map.css`** — Remove `.place-popup` rules (no longer needed on map page)

### Bottom Sheet Layout
- Drag handle bar at top
- `SwipeableImageGallery` full-width
- Title row with verified/certified icons + bookmark button
- Address, description (with fade), rating, category badge
- Website + Details buttons
- Scrollable when fully expanded

### What Stays the Same
- `LeafletMap.tsx` — no changes, already passes correct props to `PlaceOverlay`
- `PlaceCardPopup.tsx` — untouched, still used if referenced elsewhere
- Bookmark/Recommendations pages — unaffected

