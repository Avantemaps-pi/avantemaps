import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckSquare, X, MailOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BulkActionsBarProps {
  selectedCount: number;
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
  onClearSelection: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onMarkAsRead,
  onMarkAsUnread,
  onClearSelection
}) => {
  return (
    <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 p-4 shadow-lg border-2 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {selectedCount} selected
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAsRead}
            className="gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            Mark as read
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAsUnread}
            className="gap-2"
          >
            <MailOpen className="h-4 w-4" />
            Mark as unread
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default BulkActionsBar;
