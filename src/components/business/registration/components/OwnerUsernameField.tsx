import React from 'react';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';
import { useAuth } from '@/context/auth';

const OwnerUsernameField: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-2">
      <Label className="text-base">Pi Network Username</Label>
      <div className="flex items-center gap-3 p-3 bg-muted rounded-md border">
        <User className="h-5 w-5 text-muted-foreground" />
        <span className="font-medium">{user?.username || 'Unknown'}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        This username is linked to your Pi Network account and will be associated with your business.
      </p>
    </div>
  );
};

export default OwnerUsernameField;
