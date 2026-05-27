import React, { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'location_banner_dismissed';
const SESSION_FOCUS_KEY = 'ip_location_focused';
const SETTING_KEY = 'use_location_focus';

interface Props {
  className?: string;
}

const LocationBanner: React.FC<Props> = ({ className }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const evaluate = () => {
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === '1') return false;
        if (sessionStorage.getItem(SESSION_FOCUS_KEY) === '1') return false;
        if (localStorage.getItem(SETTING_KEY) === '0') return false;
        return true;
      } catch {
        return false;
      }
    };

    const t = setTimeout(() => setVisible(evaluate()), 2500);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
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
        'absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-2 rounded-full bg-background/95 backdrop-blur-sm border border-border shadow-md text-xs sm:text-sm max-w-[92vw]',
        className
      )}
    >
      <MapPin className="h-4 w-4 text-primary shrink-0" />
      <span className="text-foreground truncate">Enable location for better results</span>
      <button
        type="button"
        onClick={enable}
        className="ml-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
      >
        Enable
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="p-1 rounded-full hover:bg-accent transition-colors"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
};

export default LocationBanner;
