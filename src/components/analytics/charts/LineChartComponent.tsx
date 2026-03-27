
import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';

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

  // Format the data to show only numbers without "Day" prefix
  const formattedData = useMemo(() => {
    return data.map(item => {
      // Extract only the number from the name (e.g., "Day 1" -> "1")
      const dayNumber = item.name.replace(/\D/g, '');
      return {
        ...item,
        dayNumber,
        displayName: dayNumber // Use just the number for display
      };
    });
  }, [data]);

  // Calculate scale factors - memoized to prevent recalculation on each render
  const { xScaleFactor, yScaleFactor, maxValue } = useMemo(() => {
    // Calculate scale factors
    const xScaleFactor = localXScale / 100;
    const yScaleFactor = localYScale / 100;
    
    // Find the maximum values for the Y axis
    const maxValue = Math.max(
      ...data.map(item => Math.max(item.views, item.clicks, item.bookmarks))
    );

    return { xScaleFactor, yScaleFactor, maxValue };
  }, [localXScale, localYScale, data]);
  
  const handleWheel = (e: React.WheelEvent) => {
    // Ctrl key for zooming
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
    <div 
      className="w-full h-full overflow-auto" 
      onWheel={handleWheel}
    >
      <ResponsiveContainer width={chartWidth} height={chartHeight || 400} style={containerStyle}>
        <LineChart 
          data={formattedData} 
          margin={{ top: 15, right: 30, left: 0, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="displayName" 
            tick={{ fontSize: 12 }} 
            scale={xScaleFactor > 1 ? 'band' : 'auto'}
            interval={xScaleFactor < 1 ? Math.round(1 / xScaleFactor) - 1 : 0}
            padding={{ left: 10, right: 10 }}
          >
            <Label value="Days" position="bottom" offset={5} />
          </XAxis>
          <YAxis 
            tick={{ fontSize: 12 }} 
            domain={[0, maxValue * (1 / yScaleFactor)]}
            padding={{ top: 20, bottom: 20 }}
          />
          <Tooltip />
          <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 15 }} />
          <Line 
            type="natural" 
            dataKey="views" 
            stroke="#3b82f6" 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 4, strokeWidth: 0 }} 
          />
          <Line 
            type="natural" 
            dataKey="clicks" 
            stroke="#8b5cf6" 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 4, strokeWidth: 0 }} 
          />
          <Line 
            type="natural" 
            dataKey="bookmarks" 
            stroke="#10b981" 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 4, strokeWidth: 0 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

LineChartComponent.displayName = 'LineChartComponent';

export default LineChartComponent;
