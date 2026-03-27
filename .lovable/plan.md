

## Plan: Restyle Analytics Chart to Match CoinMarketCap Reference

### What Changes

Restyle the `LineChartComponent` to produce a clean, modern chart similar to the CoinMarketCap reference image. No structural changes needed — purely visual/cosmetic Recharts prop adjustments.

### Changes to `src/components/analytics/charts/LineChartComponent.tsx`

1. **Remove CartesianGrid** — Delete the `<CartesianGrid>` element entirely for a clean background
2. **Add gradient fill** — Switch from `<Line>` to `<Area>` (from recharts) for the primary "views" line, with a linear gradient fill fading from the line color to transparent (like the red-to-transparent fill in the reference)
3. **Keep clicks/bookmarks as thin lines** — Secondary metrics stay as `<Line>` but with reduced opacity/thinner stroke so the primary metric dominates
4. **Clean up axes** — Hide axis lines and ticks (`axisLine={false}`, `tickLine={false}`), use subtle gray tick text
5. **Remove the "Days" label** — Delete the `<Label value="Days">` from the XAxis
6. **Simplify legend** — Move legend styling to be more compact, or hide it and rely on color-coded labels below the chart
7. **Reduce margins** — Tighten the chart margins (`margin={{ top: 5, right: 10, left: -10, bottom: 5 }}`) so the chart fills more of the card
8. **Improve tooltip** — Add a custom tooltip with a cleaner design matching the overall aesthetic

### Changes to `src/components/analytics/EngagementChart.tsx`

9. **Adjust container height** — Remove excessive padding (`pb-6`) and let the chart breathe more naturally within the card

### Changes to `src/components/analytics/charts/FullScreenChart.tsx`

10. **Apply same styling** — Ensure full-screen mode uses the same clean chart style

### Technical Detail

The key Recharts change is adding an `<Area>` component with `<defs>` for the SVG gradient:

```tsx
<defs>
  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
  </linearGradient>
</defs>
<Area type="natural" dataKey="views" stroke="#3b82f6" fill="url(#viewsGradient)" />
```

This replaces `recharts`' `Line` with `Area` + `AreaChart` for the primary view, giving the gradient-filled look from the reference.

### Files Modified

- `src/components/analytics/charts/LineChartComponent.tsx` — Main visual overhaul
- `src/components/analytics/EngagementChart.tsx` — Container spacing fix
- `src/components/analytics/charts/FullScreenChart.tsx` — Consistent styling

