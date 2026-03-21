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
    <div className="flex items-center gap-1">
      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {ranges.map(range => (
        <Button
          key={range.value}
          variant={activeRange === range.value ? "default" : "ghost"}
          size="sm"
          onClick={() => onRangeChange(range.value)}
          className="text-[11px] h-6 px-1.5"
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
};

export default DateRangeFilter;
