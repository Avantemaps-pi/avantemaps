
import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Minimize } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import LineChartComponent from './LineChartComponent';

interface ChartData {
  name: string;
  views: number;
  clicks: number;
  bookmarks: number;
}

interface FullScreenChartProps {
  isFullScreen: boolean;
  setIsFullScreen: (value: boolean) => void;
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
  title,
  data,
  timelineFilter,
  setTimelineFilter,
  hasAnnualSubscription = false,
  hasRenewedAnnualSubscription = false,
}) => {
  const isMobile = useIsMobile();

  const timelineOptions = [
    { value: "day", label: "24h" },
    { value: "week", label: "1W" },
    { value: "month", label: "1M" },
    ...(hasAnnualSubscription ? [{ value: "quarter", label: "1Q" }] : []),
    ...(hasRenewedAnnualSubscription ? [{ value: "year", label: "1Y" }] : []),
  ];
  
  const chartHeight = isMobile ? 300 : 500;
  
  return (
    <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
      <DialogContent className="max-w-[95vw] w-[95vw] md:max-w-[90vw] h-[85vh] flex flex-col p-4 overflow-hidden" hideCloseButton>
        <div className="flex items-center justify-between">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/30 rounded-md p-0.5">
              {timelineOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimelineFilter(option.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    timelineFilter === option.value
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
              onClick={() => setIsFullScreen(false)}
              title="Exit Full Screen"
              className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <Minimize className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
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
        
        <div className="flex-1 w-full overflow-x-auto overflow-y-hidden pt-2 pb-4">
          <LineChartComponent 
            data={data} 
            chartWidth="100%" 
            chartHeight={chartHeight} 
            containerStyle={{ overflowX: "auto", overflowY: "hidden" }} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
});

FullScreenChart.displayName = 'FullScreenChart';

export default FullScreenChart;
