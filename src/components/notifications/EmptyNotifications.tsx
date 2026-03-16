import React from 'react';
import { Bell, MessageSquare, DollarSign, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
const EmptyNotifications: React.FC = () => {
  return <div className="py-14 px-6 text-center">
      {/* Icon with animation */}
      <div className="mb-4">
        <Bell className="h-16 w-16 mx-auto text-primary/20 animate-pulse" />
      </div>
      
      {/* Heading */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        You're all caught up!
      </h3>
      
      {/* Subtext */}
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
        We'll notify you when there are updates about your businesses, reviews, payments, or account activity.
      </p>
      
      {/* Info badges */}
      
    </div>;
};
export default EmptyNotifications;