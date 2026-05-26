
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, AlertCircle, HelpCircle, RefreshCw, ExternalLink, WifiOff, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from '@/context/auth';
import { isPiNetworkAvailable, isPiBrowser } from '@/utils/piNetwork';
import AuthTroubleshooting from './AuthTroubleshooting';
import { secureLog } from '@/utils/secureLogger';
import { toast } from 'sonner';

// Preflight statuses for Pi Browser / SDK availability.
// Order matters: the first failing check wins so we show the most
// actionable guidance to the user.
type PreflightStatus =
  | 'ok'                // SDK present, initialized, ready to authenticate
  | 'test-mode'         // preview/dev — login allowed without real SDK
  | 'offline'           // navigator.onLine === false
  | 'not-pi-browser'    // user is on a regular browser
  | 'sdk-missing'       // Pi Browser but window.Pi has not loaded
  | 'sdk-not-ready'     // window.Pi present but authenticate / init missing
  | 'checking';         // still running initial checks

interface PreflightResult {
  status: PreflightStatus;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  canAttemptLogin: boolean;
}

const PI_BROWSER_URL = 'https://minepi.com/download';

const runPreflight = (allowTestMode: boolean): PreflightResult => {
  if (typeof window === 'undefined') {
    return {
      status: 'checking',
      title: 'Checking Pi Network availability…',
      message: 'Please wait while we verify your environment.',
      canAttemptLogin: false,
    };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      status: 'offline',
      title: "You're offline",
      message:
        "We can't reach Pi Network without an internet connection. Reconnect and try again.",
      canAttemptLogin: false,
    };
  }

  if (allowTestMode && isPiNetworkAvailable()) {
    return {
      status: 'test-mode',
      title: 'Preview test mode',
      message:
        'Pi Browser is not required in this preview environment. You can sign in with a test account.',
      canAttemptLogin: true,
    };
  }

  const inPiBrowser = isPiBrowser();
  const pi = (window as any).Pi;
  const sdkInitialized = !!(window as any).__piInitialized;
  const hasAuthFn = !!(pi && typeof pi.authenticate === 'function');

  if (!inPiBrowser) {
    return {
      status: 'not-pi-browser',
      title: 'Open Avante Maps in the Pi Browser',
      message:
        'Sign-in uses Pi Network authentication, which only works inside the official Pi Browser app. Install it, then open this site from the Pi Browser to continue.',
      ctaLabel: 'Get the Pi Browser',
      ctaHref: PI_BROWSER_URL,
      canAttemptLogin: false,
    };
  }

  if (!pi) {
    return {
      status: 'sdk-missing',
      title: 'Pi Network SDK is still loading',
      message:
        "We detected the Pi Browser, but the Pi Network SDK hasn't loaded yet. Check your connection and tap Retry — or fully close and reopen the Pi Browser.",
      canAttemptLogin: false,
    };
  }

  if (!hasAuthFn || !sdkInitialized) {
    return {
      status: 'sdk-not-ready',
      title: 'Pi Network SDK is not ready',
      message:
        "The Pi SDK loaded but isn't fully initialized. This is usually temporary — wait a moment and tap Retry.",
      canAttemptLogin: false,
    };
  }

  return {
    status: 'ok',
    title: 'Ready to sign in',
    message: 'Tap Connect with Pi Network to continue.',
    canAttemptLogin: true,
  };
};


// Map raw errors to friendly, actionable messages for end users
const friendlyAuthError = (err: unknown): string => {
  const raw = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  if (!raw || raw === 'undefined' || raw === 'null') {
    return "We couldn't sign you in. Please try again.";
  }
  if (raw.includes('cancel') || raw.includes('user_cancelled') || raw.includes('aborted')) {
    return "Sign-in was cancelled. Tap Connect with Pi Network to try again.";
  }
  if (raw.includes('network') || raw.includes('fetch') || raw.includes('offline') || raw.includes('timeout')) {
    return "Network issue while contacting Pi Network. Check your connection and try again.";
  }
  if (raw.includes('sdk') || raw.includes('window.pi') || raw.includes('not available') || raw.includes('pi browser')) {
    return "Pi Network SDK is not available. Please open Avante Maps in the Pi Browser.";
  }
  if (raw.includes('permission') || raw.includes('scope') || raw.includes('denied')) {
    return "Required Pi Network permissions were not granted. Please approve all requested permissions to continue.";
  }
  if (raw.includes('unauthorized') || raw.includes('401') || raw.includes('invalid token') || raw.includes('jwt')) {
    return "Your Pi Network session is invalid or expired. Please try signing in again.";
  }
  if (raw.includes('rate') || raw.includes('429')) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }
  if (raw.includes('500') || raw.includes('server')) {
    return "Pi Network is temporarily unavailable. Please try again in a few minutes.";
  }
  return "Sign-in failed. Please try again, or use the troubleshooting steps below.";
};


// Check if we're in a preview/dev environment where test mode is allowed
const isPreviewOrDev = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.host;
  return host.includes('lovableproject.com') || 
         host.includes('localhost') || 
         host.includes('127.0.0.1');
};

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Cooldown thresholds: kick in after the 2nd consecutive failure.
// Durations escalate: 15s, 30s, 60s, then cap at 120s.
const COOLDOWN_TRIGGER_AT = 2;
const COOLDOWN_STEPS_SECONDS = [15, 30, 60, 120];

// Module-scoped state survives dialog close/reopen within a session
let persistentFailureCount = 0;
let persistentCooldownUntil = 0;

const computeCooldownSeconds = (failures: number): number => {
  if (failures < COOLDOWN_TRIGGER_AT) return 0;
  const idx = Math.min(failures - COOLDOWN_TRIGGER_AT, COOLDOWN_STEPS_SECONDS.length - 1);
  return COOLDOWN_STEPS_SECONDS[idx];
};

const LoginDialog: React.FC<LoginDialogProps> = ({ open, onOpenChange }) => {
  const { login, isLoading, authError } = useAuth();
  const [showTroubleshooting, setShowTroubleshooting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [failureCount, setFailureCount] = useState<number>(persistentFailureCount);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(() =>
    Math.max(0, Math.ceil((persistentCooldownUntil - Date.now()) / 1000))
  );
  const [preflight, setPreflight] = useState<PreflightResult>(() => ({
    status: 'checking',
    title: 'Checking Pi Network availability…',
    message: 'Please wait while we verify your environment.',
    canAttemptLogin: false,
  }));

  const allowTestMode = useMemo(() => isPreviewOrDev(), []);
  const sdkAvailable = preflight.canAttemptLogin;

  const refreshPreflight = useCallback(() => {
    setPreflight(runPreflight(allowTestMode));
  }, [allowTestMode]);

  // Reset transient UI state when dialog re-opens, but keep persistent
  // failure/cooldown state so users can't bypass by closing the dialog.
  useEffect(() => {
    if (open) {
      setLocalError(null);
      setAttemptCount(0);
      setFailureCount(persistentFailureCount);
      setCooldownRemaining(Math.max(0, Math.ceil((persistentCooldownUntil - Date.now()) / 1000)));
      refreshPreflight();
    }
  }, [open, refreshPreflight]);

  // Tick down the cooldown every second while active and dialog is open
  useEffect(() => {
    if (!open || cooldownRemaining <= 0) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((persistentCooldownUntil - Date.now()) / 1000));
      setCooldownRemaining(remaining);
    }, 1000);
    return () => clearInterval(id);
  }, [open, cooldownRemaining]);

  // Continuous preflight polling while dialog is open — the SDK can load
  // asynchronously after the user opens the dialog.
  useEffect(() => {
    if (!open) return;
    refreshPreflight();
    const checkInterval = setInterval(refreshPreflight, 1000);

    const onlineHandler = () => refreshPreflight();
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', onlineHandler);

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', onlineHandler);
    };
  }, [open, refreshPreflight]);

  const handleLogin = async () => {
    if (cooldownRemaining > 0) {
      toast.error(`Please wait ${cooldownRemaining}s before retrying.`);
      return;
    }
    // Re-run preflight at the moment of click so stale state can't
    // let us call login() against a missing/uninitialized SDK.
    const fresh = runPreflight(allowTestMode);
    setPreflight(fresh);
    if (!fresh.canAttemptLogin) {
      const msg = `${fresh.title}. ${fresh.message}`;
      setLocalError(msg);
      toast.error(fresh.title);
      secureLog.warn('Login blocked by preflight', { status: fresh.status });
      return;
    }
    setLocalError(null);
    setAttemptCount((c) => c + 1);

    try {
      secureLog.info("Starting Pi authentication...");
      await login();
      // Success: clear failure/cooldown state
      persistentFailureCount = 0;
      persistentCooldownUntil = 0;
      setFailureCount(0);
      setCooldownRemaining(0);
      onOpenChange(false);
    } catch (error) {
      secureLog.error("❌ Pi login error:", error);
      const message = friendlyAuthError(error);
      setLocalError(message);
      toast.error(message);

      // Track failure and apply cooldown
      const nextFailures = persistentFailureCount + 1;
      persistentFailureCount = nextFailures;
      setFailureCount(nextFailures);

      const seconds = computeCooldownSeconds(nextFailures);
      if (seconds > 0) {
        persistentCooldownUntil = Date.now() + seconds * 1000;
        setCooldownRemaining(seconds);
      }
    }
  };

  const handleContinueBrowsing = () => {
    onOpenChange(false);
  };

  // Prefer the most recent local error, fall back to context-level authError
  const displayError = localError ?? authError;
  const showPersistentHint = attemptCount >= 2;
  const isCoolingDown = cooldownRemaining > 0;
  const formatCooldown = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r === 0 ? `${m}m` : `${m}m ${r}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border rounded-lg shadow-lg bg-card">
        <div className="p-6 flex flex-col items-center">
          <DialogClose className="absolute right-4 top-4 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6">
            <img src="/lovable-uploads/Avante-Maps-icon.svg" alt="Pi Logo" className="w-17 h-17" />
          </div>
          
          <DialogTitle className="text-2xl mb-4 text-center font-bold">
            Sign in to <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Avante Maps</span>
          </DialogTitle>
          
          {!sdkAvailable && (
            <div className="w-full bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 p-3 rounded-md mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Pi Network SDK not detected</p>
                <p>Please ensure you're using the official Pi Browser app. This application requires Pi Network authentication to function properly.</p>
              </div>
            </div>
          )}
          
          {displayError && (
            <div
              role="alert"
              aria-live="assertive"
              className="w-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 p-3 rounded-md mb-4 flex items-start"
            >
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm flex-1">
                <p className="font-semibold mb-1">We couldn't sign you in</p>
                <p>{displayError}</p>
                {showPersistentHint && (
                  <p className="mt-2 text-xs opacity-80">
                    Still having trouble? Open the troubleshooting steps below, or try closing and reopening the Pi Browser.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={handleLogin}
                    disabled={isLoading || !sdkAvailable || isCoolingDown}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    {isCoolingDown ? `Retry in ${formatCooldown(cooldownRemaining)}` : 'Try again'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => setShowTroubleshooting(true)}
                  >
                    <HelpCircle className="h-3 w-3 mr-1" />
                    Troubleshooting
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="w-full bg-muted/50 p-4 rounded-lg mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <img src="/lovable-uploads/816179f9-d16d-46a7-9d6e-169846c0d0da.svg" alt="User" className="w-17 h-17" />
              </div>
              <div className="ml-4 text-left">
                <p className="font-medium text-lg">Pi Network User</p>
                <p className="text-sm text-muted-foreground">Connect with Pi Network</p>
              </div>
            </div>
          </div>
          
          {isCoolingDown && (
            <div
              role="status"
              aria-live="polite"
              className="w-full mb-3 text-xs text-center text-muted-foreground bg-muted/40 border border-border rounded-md py-2 px-3"
            >
              Too many failed attempts. You can retry in{' '}
              <span className="font-semibold text-foreground tabular-nums">{formatCooldown(cooldownRemaining)}</span>
              {failureCount > 0 && (
                <> · failed attempts: <span className="font-semibold">{failureCount}</span></>
              )}
            </div>
          )}

          <Button 
            className="w-full mb-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3"
            onClick={handleLogin}
            disabled={isLoading || !sdkAvailable || isCoolingDown}
          >
            {isCoolingDown
              ? `Retry in ${formatCooldown(cooldownRemaining)}`
              : isLoading
                ? "Connecting..."
                : !sdkAvailable
                  ? "Pi Network Not Available"
                  : "Connect with Pi Network"
            }
          </Button>
          
          <Button
            variant="outline"
            className="w-full mb-3"
            onClick={handleContinueBrowsing}
          >
            Continue Browsing
          </Button>

          <Button
            variant="ghost"
            className="w-full mb-6 text-sm"
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            {showTroubleshooting ? 'Hide' : 'Show'} Troubleshooting
          </Button>

          <AuthTroubleshooting isVisible={showTroubleshooting} />
          
          <div className="text-center text-sm text-muted-foreground px-4">
            <p>
              By connecting, Pi Network will share your profile information with Avante Maps. See our{' '}
              <Link to="/privacy" className="text-primary hover:underline">privacy policy</Link>
              {' '}and{' '}
              <Link to="/terms" className="text-primary hover:underline">terms of service</Link>.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
