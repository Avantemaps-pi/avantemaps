import React from 'react';
import { Bell, MessageSquare, DollarSign, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
const EmptyNotifications: React.FC = () => {
  return <div className="py-20 px-6 text-center">
      {/* Icon with animation */}
      <div className="mb-6">
        <Bell className="h-24 w-24 mx-auto text-primary/20 animate-pulse" />
      </div>
      
      {/* Heading */}
      <h3 className="text-2xl font-semibold text-foreground mb-3">
        You're all caught up!
      </h3>
      
      {/* Subtext */}
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        We'll notify you when there are updates about your businesses, reviews, payments, or account activity.
      </p>
      
      {/* Info badges */}
      
    </div>;
};
export default EmptyNotifications;