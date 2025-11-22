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
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span>Priority:</span>
      </div>
      <div className="flex gap-1">
        {priorities.map(priority => (
          <Button
            key={priority.value}
            variant={activePriority === priority.value ? "default" : "ghost"}
            size="sm"
            onClick={() => onPriorityChange(priority.value)}
            className="text-xs"
          >
            <span className={activePriority !== priority.value ? priority.color : ''}>
              {priority.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default PriorityFilter;
