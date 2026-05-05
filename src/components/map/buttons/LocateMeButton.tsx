import React, { useState } from 'react';
import { LocateFixed, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CACHE_KEY = 'ip_location_cache_v1';
const TTL_MS = 24 * 60 * 60 * 1000;

interface CachedLocation { lat: number; lng: number; ts: number }

const dispatchCenter = (lat: number, lng: number) => {
  window.dispatchEvent(new CustomEvent('centerMap', { detail: { lat, lng, zoom: 14 } }));
};

const LocateMeButton: React.FC<{ className?: string }> = ({ className }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    // Try cache first
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CachedLocation = JSON.parse(raw);
        if (Date.now() - cached.ts < TTL_MS) {
          dispatchCenter(cached.lat, cached.lng);
          return;
        }
      }
    } catch {
      // ignore
    }

    setLoading(true);
    try {
      const res = await fetch('https://ipwho.is/?fields=success,latitude,longitude');
      const data = await res.json();
      if (data?.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ lat: data.latitude, lng: data.longitude, ts: Date.now() })
        );
        dispatchCenter(data.latitude, data.longitude);
      } else {
        toast.error("Couldn't determine your location");
      }
    } catch {
      toast.error("Couldn't determine your location");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Locate me"
      title="Locate me"
      className={cn(
        'h-10 w-10 rounded-full bg-background/95 backdrop-blur-sm border border-border shadow-md flex items-center justify-center text-foreground hover:bg-accent transition-colors',
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LocateFixed className="h-4 w-4" />
      )}
    </button>
  );
};

export default LocateMeButton;
