import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/auth';
import { Button } from '@/components/ui/button';
import { shouldBypassAuth } from '@/config/environment';

/** How long a handshake may run before we offer the user an escape hatch. */
const SLOW_AUTH_MS = 20_000;

const AuthenticatingOverlay: React.FC = () => {
  const { isLoading, appReady, authError, clearAuthError, cancelLogin, login } = useAuth();
  const [progress, setProgress] = useState(0);
  const [isSlow, setIsSlow] = useState(false);

  const hideOverlay = shouldBypassAuth() || (!authError && appReady && !isLoading);

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      setIsSlow(false);
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 800);
      const slowTimer = setTimeout(() => setIsSlow(true), SLOW_AUTH_MS);
      return () => {
        clearInterval(interval);
        clearTimeout(slowTimer);
      };
    }
    setIsSlow(false);
    return undefined;
  }, [isLoading]);

  if (hideOverlay) {
    return null;
  }

  // Failure state: never keep showing fake progress over an auth attempt that
  // has already failed underneath it.
  if (authError) {
    return (
      <div className="fixed inset-0 z-[70] pointer-events-auto bg-background flex items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Sign-in didn't complete</h2>
          <p className="mt-2 text-sm text-muted-foreground">{authError}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={() => {
                clearAuthError();
                void login();
              }}
            >
              Try again
            </Button>
            <Button variant="ghost" onClick={clearAuthError}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] pointer-events-auto bg-background animate-fade-in">
      {/* Top progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-[shimmer_1.5s_infinite]" />
      </div>

      {/* Skeleton layout mimicking the app */}
      <div className="flex h-full">
        {/* Sidebar skeleton - hidden on mobile */}
        <div className="hidden md:flex flex-col w-64 border-r border-border p-4 gap-4">
          {/* Logo area */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-muted skeleton-shimmer" />
            <div className="h-5 w-28 rounded bg-muted skeleton-shimmer" />
          </div>
          {/* Nav items */}
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="h-5 w-5 rounded bg-muted skeleton-shimmer" />
              <div className="h-4 rounded bg-muted skeleton-shimmer" style={{ width: `${60 + i * 10}%` }} />
            </div>
          ))}
          {/* Spacer */}
          <div className="flex-1" />
          {/* Bottom nav items */}
          {[1, 2].map(i => (
            <div key={`b${i}`} className="flex items-center gap-3 p-2">
              <div className="h-5 w-5 rounded bg-muted skeleton-shimmer" />
              <div className="h-4 w-20 rounded bg-muted skeleton-shimmer" />
            </div>
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col">
          {/* Header skeleton */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-muted skeleton-shimmer md:hidden" />
              <div className="h-6 w-32 rounded bg-muted skeleton-shimmer" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted skeleton-shimmer" />
            </div>
          </div>

          {/* Search bar skeleton */}
          <div className="p-3">
            <div className="h-10 w-full rounded-lg bg-muted skeleton-shimmer" />
          </div>

          {/* Map area skeleton */}
          <div className="flex-1 relative bg-muted/50 m-3 rounded-lg overflow-hidden">
            {/* Fake map tiles pattern */}
            <div className="absolute inset-0 skeleton-shimmer" />
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-px opacity-20">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="bg-border" />
              ))}
            </div>

            {/* Center loading indicator */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">
                {progress < 30
                  ? 'Connecting to Pi Network...'
                  : progress < 60
                  ? 'Verifying credentials...'
                  : 'Preparing your map...'}
              </p>
              {isSlow && (
                <>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    This is taking longer than usual. Check Pi Browser for an approval prompt, or cancel and try again.
                  </p>
                  <Button variant="outline" size="sm" onClick={cancelLogin}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthenticatingOverlay;
