import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { NotificationPriority } from '@/types/notification';

interface PriorityIndicatorProps {
  priority: NotificationPriority;
  variant?: 'dot' | 'badge' | 'icon';
}

const PriorityIndicator: React.FC<PriorityIndicatorProps> = ({ 
  priority, 
  variant = 'dot' 
}) => {
  const priorityConfig = {
    high: {
      color: 'bg-destructive',
      textColor: 'text-destructive',
      label: 'High',
      icon: AlertCircle,
      badgeVariant: 'destructive' as const
    },
    medium: {
      color: 'bg-warning',
      textColor: 'text-warning',
      label: 'Medium',
      icon: AlertTriangle,
      badgeVariant: 'secondary' as const
    },
    low: {
      color: 'bg-muted',
      textColor: 'text-muted-foreground',
      label: 'Low',
      icon: Info,
      badgeVariant: 'outline' as const
    }
  };

  const config = priorityConfig[priority];
  const Icon = config.icon;

  if (variant === 'dot') {
    return (
      <div 
        className={`w-2 h-2 rounded-full ${config.color}`}
        aria-label={`${config.label} priority`}
      />
    );
  }

  if (variant === 'icon') {
    return (
      <div aria-label={`${config.label} priority`}>
        <Icon className={`h-4 w-4 ${config.textColor}`} />
      </div>
    );
  }

  return (
    <Badge variant={config.badgeVariant} className="text-xs">
      {config.label}
    </Badge>
  );
};

export default PriorityIndicator;
