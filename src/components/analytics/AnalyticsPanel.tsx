import React, { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, TrendingDown, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ChartPoint {
  name: string;
  views: number;
  clicks: number;
  bookmarks: number;
}

interface BusinessOption {
  id: number;
  business_name: string;
}

interface AnalyticsPanelProps {
  businessName: string;
  businesses: BusinessOption[];
  selectedBusinessId?: number;
  onBusinessChange?: (id: number) => void;
  data: ChartPoint[];
  totalViews: number;
  viewsTrend: number;
  totalBookmarks: number;
  totalComments: number;
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  onExport: (format: 'csv' | 'pdf') => void;
  canExport?: boolean;
  hasRenewedAnnualSubscription?: boolean;
}

interface TooltipEntry {
  dataKey: string | number;
  value?: number;
  color?: string;
}

const ChartTooltip: React.FC<{ active?: boolean; payload?: TooltipEntry[]; label?: string }> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-analytics-border bg-analytics-surface px-3 py-2 shadow-xl">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-analytics-text-muted">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={String(entry.dataKey)} className="flex items-center justify-between gap-5 py-0.5">
          <span className="flex items-center gap-1.5 text-xs capitalize text-analytics-text-muted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {String(entry.dataKey)}
          </span>
          <span className="text-xs font-bold tabular-nums text-analytics-text">
            {entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; trend?: number }> = ({ label, value, trend }) => {
  const TrendIcon = trend !== undefined && trend < 0 ? TrendingDown : TrendingUp;
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-[11px] font-medium uppercase tracking-wide text-analytics-text-muted">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums text-analytics-text sm:text-3xl">
          {value.toLocaleString()}
        </span>
        {trend !== undefined && trend !== 0 && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-[11px] font-semibold',
              trend > 0 ? 'text-analytics-success' : 'text-analytics-danger'
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
};

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  businessName,
  businesses,
  selectedBusinessId,
  onBusinessChange,
  data,
  totalViews,
  viewsTrend,
  totalBookmarks,
  totalComments,
  dateRange,
  onDateRangeChange,
  onExport,
  canExport = false,
  hasRenewedAnnualSubscription = false,
}) => {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 220 : 320;

  const timelineOptions = useMemo(
    () => [
      { value: 'day', label: '24h' },
      { value: 'week', label: '1W' },
      { value: 'month', label: '1M' },
      ...(hasRenewedAnnualSubscription ? [{ value: 'year', label: '1Y' }] : []),
    ],
    [hasRenewedAnnualSubscription]
  );

  const axisStyle = { fill: 'hsl(var(--analytics-text-muted))', fontSize: 11 };

  return (
    <div className="analytics-scope rounded-2xl border border-analytics-border bg-analytics-bg p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          {businesses.length > 1 && onBusinessChange ? (
            <Select value={selectedBusinessId?.toString()} onValueChange={(v) => onBusinessChange(parseInt(v))}>
              <SelectTrigger className="h-auto w-auto gap-1 border-none p-0 text-lg font-semibold text-analytics-text shadow-none sm:text-xl [&>svg]:h-4 [&>svg]:w-4">
                <SelectValue placeholder={businessName} />
              </SelectTrigger>
              <SelectContent>
                {businesses.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.business_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <h2 className="truncate text-lg font-semibold text-analytics-text sm:text-xl">
              {businessName}
            </h2>
          )}
          <p className="mt-0.5 text-xs text-analytics-text-muted">
            Performance &amp; engagement
          </p>
        </div>

        {canExport && (
          <Select onValueChange={(value) => onExport(value as 'csv' | 'pdf')}>
            <SelectTrigger className="h-9 w-[110px] shrink-0 border-analytics-border bg-analytics-surface text-xs text-analytics-text">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">Export as CSV</SelectItem>
              <SelectItem value="pdf">Export as PDF</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Headline stats */}
      <div className="mb-5 flex items-end gap-6 sm:gap-12">
        <Stat label="Views" value={totalViews} trend={viewsTrend} />
        <Stat label="Bookmarks" value={totalBookmarks} />
        <Stat label="Comments" value={totalComments} />
      </div>

      {/* Chart */}
      <div style={{ height: chartHeight }} className="w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="analyticsViewsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--analytics-primary))" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(var(--analytics-primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--analytics-border))" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--analytics-border))', strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="views"
              stroke="hsl(var(--analytics-primary))"
              strokeWidth={2.5}
              fill="url(#analyticsViewsFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="bookmarks"
              stroke="hsl(var(--analytics-secondary))"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[11px] text-analytics-text-muted">
          <span className="h-2 w-2 rounded-full bg-analytics-primary" />
          Views
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-analytics-text-muted">
          <span className="h-2 w-2 rounded-full bg-analytics-secondary" />
          Bookmarks
        </span>
      </div>

      {/* Date range pills */}
      <div className="mt-4 flex items-center gap-1">
        {timelineOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onDateRangeChange(option.value)}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-medium transition-colors sm:text-xs',
              dateRange === option.value
                ? 'bg-analytics-surface text-analytics-text'
                : 'text-analytics-text-muted'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsPanel;
