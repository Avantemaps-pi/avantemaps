
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  
  const chartHeight = 350;

  const lineChartComponent = useMemo(() => (
    <div className="h-full w-full">
      <LineChartComponent 
        data={data}
        chartWidth="100%"
        chartHeight={chartHeight}
        containerStyle={{ overflowX: "auto" as const, overflowY: "hidden" as const }}
      />
    </div>
  ), [data, chartHeight]);

  const timelineOptions = [
    { value: "day", label: "24h" },
    { value: "week", label: "1W" },
    { value: "month", label: "1M" },
    ...(hasAnnualSubscription ? [{ value: "quarter", label: "1Q" }] : []),
    ...(hasRenewedAnnualSubscription ? [{ value: "year", label: "1Y" }] : []),
  ];

  return (
    <>
      <Card className="w-full h-[50vh] sm:h-[60vh] min-h-[350px] sm:min-h-[450px] flex flex-col border-border/50">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl font-semibold">{title}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/30 rounded-md p-0.5">
                {timelineOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onDateRangeChange?.(option.value)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      dateRange === option.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsFullScreen(true)} 
                title="Full Screen"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] rounded-full bg-[#3b82f6]" />
              <span className="text-[11px] text-muted-foreground">Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] rounded-full bg-[#8b5cf6]" />
              <span className="text-[11px] text-muted-foreground">Clicks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] rounded-full bg-[#10b981]" />
              <span className="text-[11px] text-muted-foreground">Bookmarks</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-2 flex-1 w-full overflow-x-auto overflow-y-hidden min-h-[300px] sm:min-h-[400px]">
          {lineChartComponent}
        </CardContent>
      </Card>

      <FullScreenChart 
        isFullScreen={isFullScreen}
        setIsFullScreen={setIsFullScreen}
        title={title}
        description={description}
        data={data}
        xScale={100}
        setXScale={() => {}}
        yScale={100}
        setYScale={() => {}}
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
