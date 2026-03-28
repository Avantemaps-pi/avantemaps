
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LineChartComponent from './charts/LineChartComponent';
import FullScreenChart from './charts/FullScreenChart';

interface ChartData {
  name: string;
  views: number;
  clicks: number;
  bookmarks: number;
}

interface EngagementChartProps {
  data: ChartData[];
  title: string;
  description?: string;
  dateRange?: string;
  onDateRangeChange?: (value: string) => void;
  hasAnnualSubscription?: boolean;
  hasRenewedAnnualSubscription?: boolean;
}

const EngagementChart: React.FC<EngagementChartProps> = React.memo(({ data, title, description, dateRange = 'week', onDateRangeChange, hasAnnualSubscription = false, hasRenewedAnnualSubscription = false }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [xScale, setXScale] = useState(100);
  const [yScale, setYScale] = useState(100);
  
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };
  
  // Memoize these values to prevent recalculation on each render
  const { containerStyle, chartWidth, chartHeight } = useMemo(() => {
    // Fixed style prop with valid CSS properties
    const containerStyle = {
      overflowX: "auto" as const,
      overflowY: "hidden" as const,
      maxWidth: "100%" as const // Ensure container doesn't exceed parent width
    };
    
    // Adjust chart dimensions to fit properly within container
    const chartWidth = '100%';
    const chartHeight = 350;
    
    return { containerStyle, chartWidth, chartHeight };
  }, []);
  
  // Memoize chart components to prevent unnecessary re-renders
  const lineChartComponent = useMemo(() => (
    <div className="h-full w-full">
      <LineChartComponent 
        data={data}
        chartWidth={chartWidth}
        chartHeight={chartHeight}
        containerStyle={containerStyle}
        xScale={xScale}
        yScale={yScale}
        onXScaleChange={setXScale}
        onYScaleChange={setYScale}
      />
    </div>
  ), [data, chartWidth, chartHeight, containerStyle, xScale, yScale]);

  
  const timelineOptions = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    ...(hasAnnualSubscription ? [{ value: "quarter", label: "Quarter" }] : []),
    ...(hasRenewedAnnualSubscription ? [{ value: "year", label: "Year" }] : []),
  ];

  return (
    <>
      <Card className="w-full h-[60vh] min-h-[450px] flex flex-col">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleFullScreen} 
              title="Full Screen"
              className="mr-0"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-2 overflow-x-auto">
            <ToggleGroup 
              type="single" 
              value={dateRange} 
              onValueChange={(value) => value && onDateRangeChange?.(value)}
              className="justify-start bg-muted/20 p-1 rounded-lg"
            >
              {timelineOptions.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  aria-label={`Filter by ${option.label}`}
                  className="data-[state=on]:bg-background data-[state=on]:text-foreground px-3 py-1 text-sm"
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

        </CardHeader>
        <CardContent className="pl-0 pt-2 flex-1 w-full overflow-x-auto overflow-y-hidden flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
          <div className="w-full h-full">
            {lineChartComponent}
          </div>
        </CardContent>
      </Card>

      <FullScreenChart 
        isFullScreen={isFullScreen}
        setIsFullScreen={setIsFullScreen}
        title={title}
        description={description}
        data={data}
        xScale={xScale}
        setXScale={setXScale}
        yScale={yScale}
        setYScale={setYScale}
        timelineFilter={dateRange}
        setTimelineFilter={(v) => onDateRangeChange?.(v)}
        hasAnnualSubscription={hasAnnualSubscription}
        hasRenewedAnnualSubscription={hasRenewedAnnualSubscription}
      />
    </>
  );
});

EngagementChart.displayName = 'EngagementChart';

export default EngagementChart;
