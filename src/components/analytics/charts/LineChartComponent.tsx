
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">Day {label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-xs font-medium" style={{ color: entry.color }}>
          {entry.dataKey}: {entry.value}
        </p>
      ))}
    </div>
  );
};

const MIN_PX_PER_POINT = 50;

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
    <div ref={containerRef} className="w-full h-full overflow-x-auto overflow-y-hidden">
      <div style={{ width: chartPixelWidth, height: chartHeight || 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={formattedData} 
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bookmarksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="displayName" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
              axisLine={false}
              tickLine={false}
              interval={0}
              padding={{ left: 10, right: 10 }}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
              axisLine={false}
              tickLine={false}
              domain={[0, maxValue]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="natural" 
              dataKey="views" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              fill="url(#viewsGradient)"
              dot={false} 
              activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }} 
            />
            <Area 
              type="natural" 
              dataKey="clicks" 
              stroke="#8b5cf6" 
              strokeWidth={1.5} 
              strokeOpacity={0.6}
              fill="url(#clicksGradient)"
              dot={false} 
              activeDot={{ r: 3, strokeWidth: 0, fill: '#8b5cf6' }} 
            />
            <Area 
              type="natural" 
              dataKey="bookmarks" 
              stroke="#10b981" 
              strokeWidth={1.5} 
              strokeOpacity={0.6}
              fill="url(#bookmarksGradient)"
              dot={false} 
              activeDot={{ r: 3, strokeWidth: 0, fill: '#10b981' }} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

LineChartComponent.displayName = 'LineChartComponent';

export default LineChartComponent;
