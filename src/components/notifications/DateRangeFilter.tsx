import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

export type DateRange = 'all' | 'today' | 'week' | 'month';

interface DateRangeFilterProps {
  activeRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  activeRange,
  onRangeChange
}) => {
  const ranges: { value: DateRange; label: string }[] = [
    { value: 'all', label: 'All time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'Last 30 days' }
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Filter:</span>
      </div>
      <div className="flex gap-1">
        {ranges.map(range => (
          <Button
            key={range.value}
            variant={activeRange === range.value ? "default" : "ghost"}
            size="sm"
            onClick={() => onRangeChange(range.value)}
            className="text-xs"
          >
            {range.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default DateRangeFilter;
