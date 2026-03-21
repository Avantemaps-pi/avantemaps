import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { NotificationPriority } from '@/types/notification';

export type PriorityFilterValue = 'all' | NotificationPriority;

interface PriorityFilterProps {
  activePriority: PriorityFilterValue;
  onPriorityChange: (priority: PriorityFilterValue) => void;
}

const PriorityFilter: React.FC<PriorityFilterProps> = ({
  activePriority,
  onPriorityChange
}) => {
  const priorities: { value: PriorityFilterValue; label: string; color: string }[] = [
    { value: 'all', label: 'All priorities', color: 'text-muted-foreground' },
    { value: 'high', label: 'High', color: 'text-destructive' },
    { value: 'medium', label: 'Medium', color: 'text-warning' },
    { value: 'low', label: 'Low', color: 'text-muted-foreground' }
  ];

  return (
    <div className="flex items-center gap-1">
      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {priorities.map(priority => (
        <Button
          key={priority.value}
          variant={activePriority === priority.value ? "default" : "ghost"}
          size="sm"
          onClick={() => onPriorityChange(priority.value)}
          className="text-[11px] h-6 px-1.5"
        >
          <span className={activePriority !== priority.value ? priority.color : ''}>
            {priority.label}
          </span>
        </Button>
      ))}
    </div>
  );
};

export default PriorityFilter;
