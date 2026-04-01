
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceDot } from 'recharts';

interface ChartData {
  name: string;
  views: number;
  clicks: number;
  bookmarks: number;
}

interface LineChartComponentProps {
  data: ChartData[];
  chartWidth: string;
  chartHeight: number;
  containerStyle: {
    overflowX: "auto";
    overflowY: "hidden";
  };
  xScale?: number;
  yScale?: number;
  onXScaleChange?: (scale: number) => void;
  onYScaleChange?: (scale: number) => void;
  fitContainer?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/40 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-[11px] text-muted-foreground mb-2 font-semibold tracking-wider uppercase border-b border-border/30 pb-1.5">
        {label}
      </p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-6 py-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-card" style={{ backgroundColor: entry.color, boxShadow: `0 0 6px ${entry.color}40` }} />
            <span className="text-xs text-muted-foreground capitalize font-medium">{entry.dataKey}</span>
          </div>
          <span className="text-sm font-bold text-foreground tabular-nums">{entry.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const CustomCursor = ({ points, height }: any) => {
  if (!points?.[0]) return null;
  return (
    <line
      x1={points[0].x}
      y1={0}
      x2={points[0].x}
      y2={height}
      stroke="hsl(var(--muted-foreground))"
      strokeWidth={1}
      strokeDasharray="4 4"
      strokeOpacity={0.3}
    />
  );
};

const DEFAULT_PX_PER_POINT = 45;
const MIN_PX_PER_POINT = 20;
const MAX_PX_PER_POINT = 120;

const LineChartComponent: React.FC<LineChartComponentProps> = React.memo(({ 
  data, 
  chartHeight,
  fitContainer = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pxPerPoint, setPxPerPoint] = useState(DEFAULT_PX_PER_POINT);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const snapToNearestPoint = useCallback(() => {
    const el = containerRef.current;
    if (!el || fitContainer) return;
    const currentScroll = el.scrollLeft;
    const nearestPoint = Math.round(currentScroll / pxPerPoint) * pxPerPoint;
    el.style.scrollBehavior = 'smooth';
    el.scrollLeft = nearestPoint;
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (el) el.style.scrollBehavior = '';
      }, 300);
    });
  }, [pxPerPoint, fitContainer]);

  // Scroll-to-zoom: pinch/wheel zooms in/out
  const onWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;

    const scrollRatio = el.scrollWidth > el.clientWidth
      ? (el.scrollLeft + e.offsetX) / el.scrollWidth
      : 0.5;

    setPxPerPoint(prev => {
      const delta = e.deltaY > 0 ? -5 : 5;
      const next = Math.min(MAX_PX_PER_POINT, Math.max(MIN_PX_PER_POINT, prev + delta));
      
      requestAnimationFrame(() => {
        if (!el) return;
        const newScrollLeft = scrollRatio * el.scrollWidth - e.offsetX;
        el.scrollLeft = Math.max(0, newScrollLeft);
        setTimeout(() => snapToNearestPoint(), 150);
      });

      return next;
    });
  }, [snapToNearestPoint]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
  }, []);

  const DRAG_THRESHOLD = 5;

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const el = containerRef.current;
    if (!el) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      hasDragged.current = true;
    }
    el.scrollLeft = dragStart.current.scrollLeft - dx;
    el.scrollTop = dragStart.current.scrollTop - dy;
  }, []);

  const naturalWidth = data.length * pxPerPoint;
  const chartPixelWidth = fitContainer
    ? containerWidth || 600
    : Math.max(naturalWidth, containerWidth || 0);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const wasDrag = hasDragged.current;
    isDragging.current = false;
    hasDragged.current = false;
    const el = containerRef.current;
    if (el) el.style.cursor = 'grab';

    if (!wasDrag && el) {
      const rect = el.getBoundingClientRect();
      const tapX = e.clientX - rect.left + el.scrollLeft;
      const chartPaddingLeft = 10;
      const usableWidth = chartPixelWidth - 50;
      const pointSpacing = usableWidth / Math.max(data.length - 1, 1);
      const idx = Math.round((tapX - chartPaddingLeft) / pointSpacing);
      const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));
      setPinnedIndex(prev => prev === clampedIdx ? null : clampedIdx);
    } else {
      snapToNearestPoint();
    }
  }, [snapToNearestPoint, chartPixelWidth, data.length]);
  
  // Track scroll position for dynamic Y-axis
  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) setScrollLeft(el.scrollLeft);
    // Snap after scroll ends (debounced) — only when not dragging
    if (!isDragging.current) {
      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
      scrollEndTimer.current = setTimeout(() => snapToNearestPoint(), 200);
    }
  }, [snapToNearestPoint]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  // Compute visible data range for dynamic Y-axis
  const visibleYDomain = useMemo(() => {
    if (fitContainer || !containerWidth || !data.length) return undefined;
    const startIdx = Math.max(0, Math.floor(scrollLeft / pxPerPoint) - 1);
    const endIdx = Math.min(data.length, Math.ceil((scrollLeft + containerWidth) / pxPerPoint) + 1);
    const visibleSlice = data.slice(startIdx, endIdx);
    if (!visibleSlice.length) return undefined;

    let max = 0;
    for (const d of visibleSlice) {
      if (d.views > max) max = d.views;
      if (d.clicks > max) max = d.clicks;
      if (d.bookmarks > max) max = d.bookmarks;
    }
    return [0, Math.ceil(max * 1.15) || 10] as [number, number];
  }, [data, scrollLeft, containerWidth, pxPerPoint, fitContainer]);

  const pinnedDataPoint = pinnedIndex !== null && pinnedIndex < data.length ? data[pinnedIndex] : null;

  const labelInterval = useMemo(() => {
    if (data.length <= 7) return 0;
    const pointsVisibleInViewport = Math.floor(containerWidth / pxPerPoint);
    const desiredLabels = Math.min(pointsVisibleInViewport, 7);
    if (desiredLabels <= 0) return 0;
    return Math.max(Math.floor(data.length / desiredLabels) - 1, 0);
  }, [data.length, containerWidth, pxPerPoint]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-full min-w-0 h-full overflow-x-auto overflow-y-hidden select-none"
      style={{ maxWidth: '100%', cursor: 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div
        className="min-w-0"
        style={{
          width: fitContainer ? '100%' : chartPixelWidth,
          minWidth: fitContainer ? 0 : chartPixelWidth,
          height: chartHeight || 400,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={data} 
            margin={{ top: 10, right: 50, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bookmarksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              horizontal={true}
              vertical={false}
              stroke="hsl(var(--border))"
              strokeOpacity={0.3}
              strokeDasharray="none"
            />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
              axisLine={false}
              tickLine={false}
              interval={labelInterval}
              padding={{ left: 10, right: 10 }}
              dy={8}
            />
            <YAxis 
              orientation="right"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
              axisLine={false}
              tickLine={false}
              domain={visibleYDomain || [0, (max: number) => Math.ceil(max * 1.15) || 10]}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}
              dx={5}
              width={45}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={<CustomCursor />}
              animationDuration={150}
            />
            <Area 
              type="monotone" 
              dataKey="views" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2.5} 
              fill="url(#viewsGradient)"
              dot={false} 
              activeDot={{ r: 5, strokeWidth: 2.5, stroke: 'hsl(var(--background))', fill: 'hsl(var(--primary))', className: 'drop-shadow-md' }} 
              animationDuration={600}
              animationEasing="ease-out"
            />
            <Area 
              type="monotone" 
              dataKey="clicks" 
              stroke="#8b5cf6" 
              strokeWidth={1.5} 
              strokeOpacity={0.8}
              fill="url(#clicksGradient)"
              dot={false} 
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))', fill: '#8b5cf6' }} 
              animationDuration={600}
              animationEasing="ease-out"
            />
            <Area 
              type="monotone" 
              dataKey="bookmarks" 
              stroke="#10b981" 
              strokeWidth={1.5} 
              strokeOpacity={0.8}
              fill="url(#bookmarksGradient)"
              dot={false} 
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))', fill: '#10b981' }} 
              animationDuration={600}
              animationEasing="ease-out"
            />
            {/* Crosshair tracker dots at viewport center */}
            {centerDataPoint && !fitContainer && (
              <>
                <ReferenceLine
                  x={centerDataPoint.name}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                />
                <ReferenceDot
                  x={centerDataPoint.name}
                  y={centerDataPoint.views}
                  r={6}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth={2.5}
                  isFront
                />
                <ReferenceDot
                  x={centerDataPoint.name}
                  y={centerDataPoint.clicks}
                  r={5}
                  fill="#8b5cf6"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  isFront
                />
                <ReferenceDot
                  x={centerDataPoint.name}
                  y={centerDataPoint.bookmarks}
                  r={5}
                  fill="#10b981"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  isFront
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Floating center value badge */}
      {centerDataPoint && !fitContainer && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 z-10">
          <div className="bg-card/90 backdrop-blur-md border border-border/40 rounded-lg px-3 py-1.5 shadow-lg">
            <p className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase mb-1">
              {centerDataPoint.name}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                <span className="text-xs font-bold text-foreground tabular-nums">{centerDataPoint.views.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
                <span className="text-xs font-bold text-foreground tabular-nums">{centerDataPoint.clicks.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                <span className="text-xs font-bold text-foreground tabular-nums">{centerDataPoint.bookmarks.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

LineChartComponent.displayName = 'LineChartComponent';

export default LineChartComponent;
