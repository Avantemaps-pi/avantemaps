import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Place } from '@/types/business';
import { Button } from '@/components/ui/button';
import { useBusinessBookmarks } from '@/hooks/useBusinessBookmarks';
import { useAuth } from '@/context/auth';
import CompactPlaceCard from './CompactPlaceCard';
import { LIST_MAX } from './mapList';

interface MapListViewProps {
  /** Every business in view, nearest to the map centre first */
  places: Place[];
  /** Active category and search, e.g. 'Food · matching "coffee"' */
  subtitle?: string | undefined;
  /** The card strip's business (opened from the strip): scrolled into view, aria-current */
  selectedId?: string | null | undefined;
  /** The business drawer is open over the list (it handles Escape itself) */
  drawerOpen: boolean;
  onOpen: (id: string) => void;
  onClose: () => void;
}

/**
 * Every business in view as a list, over the map (below the business drawer,
 * above the map UI; the bottom nav stays usable). Rows are the strip's cards.
 */
const MapListView: React.FC<MapListViewProps> = ({ places, subtitle, selectedId, drawerOpen, onOpen, onClose }) => {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const rows = places.slice(0, LIST_MAX);
  const count = places.length;

  // One bookmark source for the whole list, as in the strip
  const { isAuthenticated } = useAuth();
  const { isBookmarked, toggleBookmark, isLoading: bookmarksLoading } = useBusinessBookmarks();
  const [pendingBookmarkId, setPendingBookmarkId] = useState<string | null>(null);
  const handleBookmarkToggle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please sign in to bookmark businesses');
      return;
    }
    setPendingBookmarkId(id);
    try {
      await toggleBookmark(id);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    } finally {
      setPendingBookmarkId(null);
    }
  };

  // On open: focus the title, and show the strip's business if there is one
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    if (selectedId) {
      const row = bodyRef.current?.querySelector<HTMLElement>(`[data-list-row="${CSS.escape(selectedId)}"]`);
      row?.scrollIntoView({ block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the list opens
  }, []);

  // Escape closes the list (the drawer handles Escape itself while it's open)
  useEffect(() => {
    if (drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-list-title"
      data-map-list-view
      className="fixed inset-0 z-40 flex flex-col bg-background text-foreground md:pl-[264px] animate-in slide-in-from-bottom-4 fade-in-0 duration-200 motion-reduce:animate-none"
    >
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background px-2 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full [&_svg]:size-5"
            aria-label="Back to map"
            onClick={onClose}
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0 flex-1">
            <h2
              ref={titleRef}
              id="map-list-title"
              tabIndex={-1}
              className="truncate text-lg font-semibold leading-6 text-foreground outline-hidden"
            >
              {count === 1 ? '1 business in this area' : `${count} businesses in this area`}
            </h2>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </header>

        <ul className="flex flex-col gap-3 px-4 pt-3">
          {rows.map((place) => (
            <li key={place.id}>
              <CompactPlaceCard
                variant="list"
                place={place}
                selected={place.id === selectedId}
                onOpen={() => onOpen(place.id)}
                isBookmarked={isBookmarked(place.id)}
                onBookmarkToggle={(e) => handleBookmarkToggle(e, place.id)}
                // While the list loads every row waits; during a toggle only that row does
                bookmarkLoading={pendingBookmarkId ? pendingBookmarkId === place.id : bookmarksLoading}
              />
            </li>
          ))}
        </ul>
        {count > LIST_MAX && (
          <p className="px-4 pt-4 text-center text-sm text-muted-foreground">Zoom in to see more businesses here.</p>
        )}
      </div>
    </div>
  );
};

export default MapListView;
