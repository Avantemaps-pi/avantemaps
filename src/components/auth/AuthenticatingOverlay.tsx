import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth';
import { Shield, Loader2 } from 'lucide-react';
import { shouldBypassAuth } from '@/config/environment';

const AuthenticatingOverlay: React.FC = () => {
  const { isLoading } = useAuth();
  const [progress, setProgress] = useState(0);

  // Don't show overlay in development mode when auth is bypassed
  if (!isLoading || shouldBypassAuth()) {
    return null;
  }

  // Simulate progress for better UX
  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 800);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center space-y-4 p-8 rounded-lg bg-card border border-border shadow-lg">
        <Shield className="h-12 w-12 text-primary animate-pulse" />
        <div className="flex flex-col items-center space-y-2">
          <h2 className="text-xl font-semibold">Authenticating</h2>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {progress < 30 ? 'Connecting to Pi Network...' : 
               progress < 60 ? 'Verifying credentials...' : 
               'Finalizing...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthenticatingOverlay;
