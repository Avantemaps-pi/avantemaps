import React, { useEffect, useState } from 'react';
import { LocateFixed, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'location_banner_dismissed';
const SETTING_KEY = 'use_location_focus';
// Set by LocateMeButton once it has shown the browser's location prompt
const PROMPTED_KEY = 'geolocation_prompted';
// Persistent flag — once the user has seen the location prompt, never show it again.
const SEEN_KEY = 'location_banner_seen';

interface Props {
  className?: string;
}

const LocationBanner: React.FC<Props> = ({ className }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // The one invitation to allow device location: shown once ever, only while
    // "Use my location" is on and the browser would still ask for permission.
    const evaluate = async () => {
      try {
        if (localStorage.getItem(SEEN_KEY) === '1') return false;
        if (sessionStorage.getItem(DISMISS_KEY) === '1') return false;
        if (localStorage.getItem(SETTING_KEY) === '0') return false;
        if (localStorage.getItem(PROMPTED_KEY) === '1') return false;
      } catch {
        return false;
      }
      // No Permissions API (or it throws): the checks above are all we can go on
      if (!navigator.permissions?.query) return true;
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return status.state === 'prompt';
      } catch {
        return true;
      }
    };

    const t = setTimeout(async () => {
      const show = await evaluate();
      if (!cancelled) setVisible(show);
    }, 2500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  if (!visible) return null;

  const markSeen = () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  const dismiss = () => {
    markSeen();
    setVisible(false);
  };

  const enable = () => {
    window.dispatchEvent(new CustomEvent('trigger-locate-me'));
    dismiss();
  };

  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-3 rounded-xl bg-surface-float border border-border shadow-float py-2 pl-3 pr-1',
        className
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
        <LocateFixed className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Businesses near you</p>
        <p className="text-xs text-muted-foreground">Only used to centre the map.</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={enable}
        className="h-11 sm:h-11 shrink-0 rounded-full px-4 text-sm font-semibold"
      >
        Allow
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={dismiss}
        aria-label="Dismiss"
        className="h-11 w-11 sm:h-11 sm:w-11 shrink-0 rounded-full text-muted-foreground [&_svg]:size-5 sm:[&_svg]:size-5"
      >
        <X />
      </Button>
    </div>
  );
};

export default LocationBanner;
