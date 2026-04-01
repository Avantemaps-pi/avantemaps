

## Summary

The video shows a **drag-to-track** crosshair UX (like CoinMarketCap/TradingView mobile), where:
- Touch-and-hold on the chart activates a crosshair
- Dragging horizontally snaps the tracking dot to each data point under the finger
- Lifting the finger dismisses the crosshair
- During tracking, the chart does NOT scroll — finger movement controls which point is highlighted

This differs from the current tap-to-pin implementation. The key UX distinction: **the crosshair follows the finger in real-time during a drag gesture, rather than being placed by a tap.**

## Plan

### 1. Replace tap-to-pin with drag-to-track mode
**File: `src/components/analytics/charts/LineChartComponent.tsx`**

- Replace `pinnedIndex` state with `trackingIndex` (active only while finger is down)
- On `pointerdown`: record start position, set a short delay (~150ms) to distinguish scroll vs track
- On `pointermove`: if tracking is active, calculate the nearest data point index from the finger's X position and update `trackingIndex` in real-time. Prevent chart scrolling during tracking.
- On `pointerup`/`pointerleave`: clear `trackingIndex` (crosshair disappears)

### 2. Distinguish scroll vs track gestures
- If the user moves quickly (momentum scroll), treat it as a pan/scroll
- If the user holds for ~150ms before moving, activate tracking mode and prevent scrolling
- This ensures normal drag-to-pan still works for navigation

### 3. Fix build errors
- Replace any remaining `centerDataPoint` references with the correct variable name (the build errors suggest stale references exist in the deployed version)

### Technical Details

```text
Gesture flow:
  pointerdown → start 150ms timer
    ├─ finger moves > threshold before timer → pan mode (existing behavior)
    └─ timer fires while finger still down → tracking mode
        ├─ pointermove → update trackingIndex from X position
        └─ pointerup → clear trackingIndex, crosshair disappears
```

- During tracking mode: `e.preventDefault()` on scroll, `pointer-events` managed to block chart's native tooltip
- `trackingIndex` maps finger X → nearest data point using same `pointSpacing` math as current tap logic
- ReferenceLine + ReferenceDots + floating badge render identically to current pinned UI, but only while `trackingIndex !== null`

