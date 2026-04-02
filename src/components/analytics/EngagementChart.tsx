
import React, { useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Maximize, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  const isMobile = useIsMobile();
  
  const chartHeight = isMobile ? 280 : 400;

  // Calculate summary stats from chart data
  const summaryStats = useMemo(() => {
    const totalViews = data.reduce((sum, d) => sum + d.views, 0);
    const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);
    const totalBookmarks = data.reduce((sum, d) => sum + d.bookmarks, 0);
    
    // Simple trend: compare second half to first half
    const mid = Math.floor(data.length / 2);
    const firstHalfViews = data.slice(0, mid).reduce((s, d) => s + d.views, 0);
    const secondHalfViews = data.slice(mid).reduce((s, d) => s + d.views, 0);
    const viewsTrend = firstHalfViews > 0 
      ? Math.round(((secondHalfViews - firstHalfViews) / firstHalfViews) * 100) 
      : secondHalfViews > 0 ? 100 : 0;

    return { totalViews, totalClicks, totalBookmarks, viewsTrend };
  }, [data]);

  const TrendIcon = summaryStats.viewsTrend > 0 ? TrendingUp : summaryStats.viewsTrend < 0 ? TrendingDown : Minus;
  const trendColor = summaryStats.viewsTrend > 0 ? 'text-emerald-500' : summaryStats.viewsTrend < 0 ? 'text-red-500' : 'text-muted-foreground';

  const lineChartComponent = useMemo(() => (
    <div className="h-full w-full min-w-0 max-w-full">
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
    
    ...(hasRenewedAnnualSubscription ? [{ value: "year", label: "1Y" }] : []),
  ];

  return (
    <>
      <Card className="w-full max-w-full min-w-0 overflow-hidden h-[50vh] sm:h-[60vh] min-h-[350px] sm:min-h-[450px] flex flex-col border-border/50">
        <CardHeader className="pb-0 min-w-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl font-semibold">{title}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5">
                {timelineOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onDateRangeChange?.(option.value)}
                    className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-all duration-200 ${
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

          {/* Summary Stats Row */}
          <div className="flex items-center gap-4 sm:gap-6 mt-3 pb-1">
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                {summaryStats.totalViews.toLocaleString()}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Views</span>
                {summaryStats.viewsTrend !== 0 && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-medium ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                    {Math.abs(summaryStats.viewsTrend)}%
                  </span>
                )}
              </div>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                {summaryStats.totalClicks.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground">Clicks</span>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                {summaryStats.totalBookmarks.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground">Bookmarks</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] rounded-full bg-primary" />
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
        <CardContent className="px-0 pt-2 flex-1 w-full max-w-full min-w-0 overflow-hidden min-h-[200px] sm:min-h-[400px]">
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
