

## Plan: Make Chart X-Axis Labels Scrollable Instead of Bundled

### Problem
On mobile, all date labels (1-28) are crammed together on the x-axis, making them overlap and unreadable. The chart tries to display every label at once.

### Solution
Give the chart a fixed minimum width per data point so labels are spaced out, and wrap it in a horizontally scrollable container. Users scroll left/right to see different dates.

### Changes

**`src/components/analytics/charts/LineChartComponent.tsx`**
- Calculate a minimum chart width based on the number of data points (e.g., `data.length * 50px`, minimum 100% of container)
- Set the `ResponsiveContainer` or inner `AreaChart` width to this calculated pixel width instead of percentage-based `chartWidth`
- Ensure the outer `div` has `overflow-x: auto` and `overflow-y: hidden` so users can scroll horizontally
- Set XAxis `interval={0}` so every label is shown (since they now have room)

**`src/components/analytics/EngagementChart.tsx`**
- Update the `CardContent` container to allow horizontal overflow (`overflow-x-auto`) instead of `overflow-hidden`

**`src/components/analytics/charts/FullScreenChart.tsx`**
- Same scrollable treatment for the full-screen view container

### Technical Detail
The key change is replacing percentage-based width with a pixel-based minimum:
```tsx
const minWidth = Math.max(data.length * 50, containerWidth);
// Render AreaChart with width={minWidth} inside a scrollable div
```

This ensures labels are always spaced ~50px apart. When there are many data points, the chart extends beyond the viewport and becomes scrollable.

