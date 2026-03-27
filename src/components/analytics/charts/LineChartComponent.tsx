
import React, { useState, useMemo } from 'react';
import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

const LineChartComponent: React.FC<LineChartComponentProps> = React.memo(({ 
  data, 
  chartWidth, 
  chartHeight, 
  containerStyle,
  xScale = 100,
  yScale = 100,
  onXScaleChange,
  onYScaleChange
}) => {
  const [localXScale, setLocalXScale] = useState(xScale);
  const [localYScale, setLocalYScale] = useState(yScale);

  const formattedData = useMemo(() => {
    return data.map(item => {
      const dayNumber = item.name.replace(/\D/g, '');
      return { ...item, dayNumber, displayName: dayNumber };
    });
  }, [data]);

  const { xScaleFactor, yScaleFactor, maxValue } = useMemo(() => {
    const xScaleFactor = localXScale / 100;
    const yScaleFactor = localYScale / 100;
    const maxValue = Math.max(
      ...data.map(item => Math.max(item.views, item.clicks, item.bookmarks))
    );
    return { xScaleFactor, yScaleFactor, maxValue };
  }, [localXScale, localYScale, data]);
  
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      const newXScale = Math.max(50, Math.min(300, localXScale + delta));
      const newYScale = Math.max(50, Math.min(300, localYScale + delta));
      setLocalXScale(newXScale);
      setLocalYScale(newYScale);
      onXScaleChange?.(newXScale);
      onYScaleChange?.(newYScale);
    }
  };
  
  return (
    <div className="w-full h-full overflow-auto" onWheel={handleWheel}>
      <ResponsiveContainer width={chartWidth} height={chartHeight || 400} style={containerStyle}>
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
            scale={xScaleFactor > 1 ? 'band' : 'auto'}
            interval={xScaleFactor < 1 ? Math.round(1 / xScaleFactor) - 1 : 0}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
            axisLine={false}
            tickLine={false}
            domain={[0, maxValue * (1 / yScaleFactor)]}
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
  );
});

LineChartComponent.displayName = 'LineChartComponent';

export default LineChartComponent;
