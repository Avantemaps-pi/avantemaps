
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

const MIN_PX_PER_POINT = 45;

const LineChartComponent: React.FC<LineChartComponentProps> = React.memo(({ 
  data, 
  chartHeight,
  fitContainer = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
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

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    const el = containerRef.current;
    if (el) el.style.cursor = 'grab';
  }, []);

  // In fitContainer mode, always use the container width (no horizontal scroll)
  const naturalWidth = data.length * MIN_PX_PER_POINT;
  const chartPixelWidth = fitContainer
    ? containerWidth || 600
    : naturalWidth;
  
  const labelInterval = useMemo(() => {
    if (data.length <= 7) return 0;
    const pointsVisibleInViewport = Math.floor(containerWidth / MIN_PX_PER_POINT);
    const desiredLabels = Math.min(pointsVisibleInViewport, 7);
    if (desiredLabels <= 0) return 0;
    return Math.max(Math.floor(data.length / desiredLabels) - 1, 0);
  }, [data.length, containerWidth]);

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
        className="max-w-full min-w-0"
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
              domain={[0, (max: number) => Math.ceil(max * 1.15) || 10]}
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
