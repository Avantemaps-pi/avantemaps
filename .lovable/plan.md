

## Fix Empty Space at Top of Recommendations Page

There's a noticeable gap (~60px) between the "Recommendations" header and the search bar. This is caused by excessive vertical spacing in the container and the sticky filter section.

### Changes in `src/pages/Recommendations.tsx`

1. **Line 128** — Remove `mt-2` from the outer container div, change to `mt-0`
2. **Line 130** — Reduce `mb-4` to `mb-2` on the sticky search/filter section, and remove `pt-1` (or keep minimal)
3. Tighten the `space-y-3` inside the sticky section to `space-y-2`

This will pull the search bar up closer to the header, eliminating the awkward empty space.

