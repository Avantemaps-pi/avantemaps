
import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Minimize } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import LineChartComponent from './LineChartComponent';
import BarChartComponent from './BarChartComponent';

interface ChartData {
  name: string;
  views: number;
  clicks: number;
  bookmarks: number;
}

interface FullScreenChartProps {
  isFullScreen: boolean;
  setIsFullScreen: (value: boolean) => void;
  activeTab: 'line' | 'bar';
  handleTabChange: (value: string) => void;
  title: string;
  description?: string;
  data: ChartData[];
  xScale: number;
  setXScale: (value: number) => void;
  yScale: number;
  setYScale: (value: number) => void;
  timelineFilter: string;
  setTimelineFilter: (value: string) => void;
  hasAnnualSubscription?: boolean;
  hasRenewedAnnualSubscription?: boolean;
}

const FullScreenChart: React.FC<FullScreenChartProps> = React.memo(({
  isFullScreen,
  setIsFullScreen,
  activeTab,
  handleTabChange,
  title,
  description,
  data,
  xScale,
  setXScale,
  yScale,
  setYScale,
  timelineFilter,
  setTimelineFilter,
  hasAnnualSubscription = false,
  hasRenewedAnnualSubscription = false,
}) => {
  const isMobile = useIsMobile();

  const timelineOptions = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    ...(hasAnnualSubscription ? [{ value: "quarter", label: "Quarter" }] : []),
    ...(hasRenewedAnnualSubscription ? [{ value: "year", label: "Year" }] : []),
  ];
  
  // Use useMemo to calculate chart dimensions to avoid recalculations
  const { chartWidth, chartHeight, containerStyle } = useMemo(() => {
    // Calculate scale factors
    const xScaleFactor = xScale / 100;
    const yScaleFactor = yScale / 100;
    
    // Apply scale to chart dimensions
    const chartWidth = `${100 * xScaleFactor}%`;
    // Reduce the height for better fit on screen
    const chartHeight = (isMobile ? 200 : 350) * yScaleFactor; // Further reduced height for better fit
    
    // Fixed style prop with valid CSS properties
    const containerStyle = {
      overflowX: "auto" as const,
      overflowY: "hidden" as const
    };

    return { chartWidth, chartHeight, containerStyle };
  }, [xScale, yScale, isMobile]);
  
  // Memoize the chart component to prevent unnecessary re-renders
  const chartComponent = useMemo(() => {
    if (activeTab === 'line') {
      return (
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
      );
    } else {
      return (
        <BarChartComponent 
          data={data} 
          chartWidth={chartWidth} 
          chartHeight={chartHeight} 
          containerStyle={containerStyle} 
          xScale={xScale}
          yScale={yScale}
          onXScaleChange={setXScale}
          onYScaleChange={setYScale}
        />
      );
    }
  }, [activeTab, data, chartWidth, chartHeight, containerStyle, xScale, yScale, setXScale, setYScale]);
  
  return (
    <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
      <DialogContent className="max-w-[95vw] w-[95vw] md:max-w-[90vw] h-[80vh] flex flex-col p-4 overflow-hidden" hideCloseButton>
        <div className="flex items-center justify-between">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsFullScreen(false)}
            title="Exit Full Screen"
            className="ml-2 flex-shrink-0"
          >
            <Minimize className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-4 mb-2 overflow-x-auto">
          <ToggleGroup 
            type="single" 
            value={timelineFilter} 
            onValueChange={(value) => value && setTimelineFilter(value)}
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
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex-1 flex flex-col">
          <div className="flex items-center mb-2">
            <TabsList>
              <TabsTrigger value="line">Line</TabsTrigger>
              <TabsTrigger value="bar">Bar</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 w-full overflow-hidden pb-4">
            {chartComponent}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
});

FullScreenChart.displayName = 'FullScreenChart';

export default FullScreenChart;
