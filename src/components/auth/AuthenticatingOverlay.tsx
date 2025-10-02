import React from 'react';
import { useAuth } from '@/context/auth';
import { Shield } from 'lucide-react';

const AuthenticatingOverlay: React.FC = () => {
  const { isLoading } = useAuth();

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center space-y-4 p-8 rounded-lg bg-card border border-border shadow-lg">
        <Shield className="h-12 w-12 text-primary animate-pulse" />
        <div className="flex flex-col items-center space-y-2">
          <h2 className="text-xl font-semibold">Authenticating</h2>
          <p className="text-sm text-muted-foreground">Connecting to Pi Network...</p>
        </div>
      </div>
    </div>
  );
};

export default AuthenticatingOverlay;
