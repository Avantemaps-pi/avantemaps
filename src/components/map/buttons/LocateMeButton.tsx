import React, { useState } from 'react';
import { LocateFixed, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CACHE_KEY = 'ip_location_cache_v1';
const TTL_MS = 24 * 60 * 60 * 1000;
const TOAST_ID = 'locate-me';

interface CachedLocation { lat: number; lng: number; ts: number }

const dispatchCenter = (lat: number, lng: number) => {
  window.dispatchEvent(new CustomEvent('centerMap', { detail: { lat, lng, zoom: 14 } }));
};

const LocateMeButton: React.FC<{ className?: string }> = ({ className }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;

    // Try cache first — instant, no loading state needed
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CachedLocation = JSON.parse(raw);
        if (Date.now() - cached.ts < TTL_MS) {
          dispatchCenter(cached.lat, cached.lng);
          toast.success('Centered on your approximate location', { id: TOAST_ID });
          return;
        }
      }
    } catch {
      // ignore
    }

    setLoading(true);
    toast.loading('Resolving your location…', {
      id: TOAST_ID,
      description: 'Using IP-based location (privacy-friendly).',
    });

    try {
      const res = await fetch('https://ipwho.is/?fields=success,latitude,longitude');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ lat: data.latitude, lng: data.longitude, ts: Date.now() })
        );
        dispatchCenter(data.latitude, data.longitude);
        toast.success('Centered on your approximate location', { id: TOAST_ID });
      } else {
        toast.error("Couldn't determine your location", {
          id: TOAST_ID,
          description: data?.message || 'The location service returned no data. Please try again.',
        });
      }
    } catch (err) {
      toast.error("Couldn't determine your location", {
        id: TOAST_ID,
        description: 'Network or service error. Check your connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={loading ? 'Resolving your location' : 'Locate me'}
      aria-busy={loading}
      title={loading ? 'Resolving your location…' : 'Locate me'}
      className={cn(
        'h-10 w-10 rounded-full bg-background/95 backdrop-blur-sm border border-border shadow-md flex items-center justify-center text-foreground hover:bg-accent transition-colors disabled:opacity-70 disabled:cursor-progress',
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
