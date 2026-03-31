
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

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

  // Scroll-to-zoom: pinch/wheel zooms in/out
  const onWheel = useCallback((e: WheelEvent) => {
    // Only zoom on ctrl/meta (pinch gesture) or shift+scroll
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;

    // Calculate scroll ratio to maintain zoom center
    const scrollRatio = el.scrollWidth > el.clientWidth
      ? (el.scrollLeft + e.offsetX) / el.scrollWidth
      : 0.5;

    setPxPerPoint(prev => {
      const delta = e.deltaY > 0 ? -5 : 5;
      const next = Math.min(MAX_PX_PER_POINT, Math.max(MIN_PX_PER_POINT, prev + delta));
      
      // Restore scroll position after zoom, then snap
      requestAnimationFrame(() => {
        if (!el) return;
        const newScrollLeft = scrollRatio * el.scrollWidth - e.offsetX;
        el.scrollLeft = Math.max(0, newScrollLeft);
        // Snap after zoom settles
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
    dragStart.current = { x: e.clientX, y: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const el = containerRef.current;
    if (!el) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    el.scrollLeft = dragStart.current.scrollLeft - dx;
    el.scrollTop = dragStart.current.scrollTop - dy;
  }, []);

  const snapToNearestPoint = useCallback(() => {
    const el = containerRef.current;
    if (!el || fitContainer) return;
    const currentScroll = el.scrollLeft;
    const nearestPoint = Math.round(currentScroll / pxPerPoint) * pxPerPoint;
    el.style.scrollBehavior = 'smooth';
    el.scrollLeft = nearestPoint;
    // Reset after smooth scroll completes
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (el) el.style.scrollBehavior = '';
      }, 300);
    });
  }, [pxPerPoint, fitContainer]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    const el = containerRef.current;
    if (el) el.style.cursor = 'grab';
    snapToNearestPoint();
  }, [snapToNearestPoint]);

  const naturalWidth = data.length * pxPerPoint;
  const chartPixelWidth = fitContainer
    ? containerWidth || 600
    : Math.max(naturalWidth, containerWidth || 0);
  
  // Track scroll position for dynamic Y-axis
  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) setScrollLeft(el.scrollLeft);
  }, []);

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
      className="w-full max-w-full min-w-0 h-full overflow-x-auto overflow-y-hidden select-none"
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
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

LineChartComponent.displayName = 'LineChartComponent';

export default LineChartComponent;
