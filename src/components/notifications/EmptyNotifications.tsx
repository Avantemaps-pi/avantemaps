import React from 'react';
import { Bell } from 'lucide-react';

const EmptyNotifications: React.FC = () => {
  return (
    <div className="py-14 px-6 text-center">
      {/* Icon with background circle */}
      <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
        <Bell className="h-12 w-12 text-primary" />
      </div>

      {/* Heading */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Nothing here yet
      </h3>

      {/* Subtext */}
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        You'll be notified about reviews, messages, and business activity.
      </p>
    </div>
  );
};

export default EmptyNotifications;
