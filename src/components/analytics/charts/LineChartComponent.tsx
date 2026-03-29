
import React, { useMemo, useRef, useState, useEffect } from 'react';
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
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-muted-foreground mb-1 font-medium tracking-wide uppercase">Day {label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-muted-foreground capitalize">{entry.dataKey}</span>
          <span className="text-xs font-semibold text-foreground ml-auto">{entry.value?.toLocaleString()}</span>
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
      strokeOpacity={0.4}
    />
  );
};

const MIN_PX_PER_POINT = 12;

const LineChartComponent: React.FC<LineChartComponentProps> = React.memo(({ 
  data, 
  chartHeight, 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

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

  const formattedData = useMemo(() => {
    return data.map(item => {
      const dayNumber = item.name.replace(/\D/g, '');
      return { ...item, dayNumber, displayName: dayNumber };
    });
  }, [data]);

  const maxValue = useMemo(() => {
    return Math.max(...data.map(item => Math.max(item.views, item.clicks, item.bookmarks)), 1);
  }, [data]);

  const chartPixelWidth = Math.max(data.length * MIN_PX_PER_POINT, containerWidth);

  return (
    <div ref={containerRef} className="w-full h-full overflow-x-auto overflow-y-hidden touch-pan-x">
      <div style={{ width: chartPixelWidth, height: chartHeight || 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={formattedData} 
            margin={{ top: 10, right: 50, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bookmarksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              horizontal={true}
              vertical={false}
              stroke="hsl(var(--border))"
              strokeOpacity={0.4}
              strokeDasharray="none"
            />
            <XAxis 
              dataKey="displayName" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
              axisLine={false}
              tickLine={false}
              interval={0}
              padding={{ left: 10, right: 10 }}
              dy={8}
            />
            <YAxis 
              orientation="right"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
              axisLine={false}
              tickLine={false}
              domain={[0, (max: number) => Math.ceil(max * 1.1)]}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}
              dx={5}
              width={45}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={<CustomCursor />}
            />
            <Area 
              type="monotone" 
              dataKey="views" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              fill="url(#viewsGradient)"
              dot={false} 
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#3b82f6' }} 
            />
            <Area 
              type="monotone" 
              dataKey="clicks" 
              stroke="#8b5cf6" 
              strokeWidth={1.5} 
              strokeOpacity={0.7}
              fill="url(#clicksGradient)"
              dot={false} 
              activeDot={{ r: 3, strokeWidth: 2, stroke: '#fff', fill: '#8b5cf6' }} 
            />
            <Area 
              type="monotone" 
              dataKey="bookmarks" 
              stroke="#10b981" 
              strokeWidth={1.5} 
              strokeOpacity={0.7}
              fill="url(#bookmarksGradient)"
              dot={false} 
              activeDot={{ r: 3, strokeWidth: 2, stroke: '#fff', fill: '#10b981' }} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

LineChartComponent.displayName = 'LineChartComponent';

export default LineChartComponent;
