import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth';
import { Shield, Loader2 } from 'lucide-react';
import { shouldBypassAuth } from '@/config/environment';

const AuthenticatingOverlay: React.FC = () => {
  const { isLoading, appReady } = useAuth();
  const [progress, setProgress] = useState(0);

  // Don't show overlay in development mode when auth is bypassed
  if (shouldBypassAuth() || (appReady && !isLoading)) {
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
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-fade-in"
      style={{
        backgroundColor: '#8000ff',
      }}
    >
      <Shield className="h-16 w-16 text-white animate-pulse mb-6" />
      <h2 className="text-2xl font-semibold text-white mb-4">
        {isLoading ? 'Authenticating' : 'Success!'}
      </h2>
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-white" />
        <p className="text-white/90">
          {isLoading 
            ? (progress < 30 ? 'Connecting to Pi Network...' : 
               progress < 60 ? 'Verifying credentials...' : 
               'Finalizing...')
            : 'Preparing your map...'}
        </p>
      </div>
    </div>
  );
};

export default AuthenticatingOverlay;
