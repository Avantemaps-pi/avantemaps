import React, { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PlaceCard from '@/components/business/PlaceCard';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, BookmarkX, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessBookmarks } from '@/hooks/useBusinessBookmarks';
import { useBookmarkedBusinesses } from '@/hooks/useBookmarkedBusinesses';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';

const PULL_TRIGGER = 70; // px to trigger refresh
const PULL_MAX = 110;    // px max visual pull

const Bookmarks = () => {
  const navigate = useNavigate();
  const { removeBookmark } = useBusinessBookmarks();
  const { bookmarkedPlaces, isLoading } = useBookmarkedBusinesses();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const pullingRef = useRef(false);
  const startYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await queryClient.refetchQueries({ queryKey: ['bookmarked-businesses'] });
      toast.success('Bookmarks synced');
    } catch (e) {
      toast.error('Failed to sync bookmarks');
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull-to-refresh touch handlers
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only start a pull when scrolled to the top of the page
      if (window.scrollY > 0) return;
      pullingRef.current = true;
      startYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        setPullDistance(0);
        return;
      }
      // Resistance curve
      const resisted = Math.min(PULL_MAX, dy * 0.5);
      setPullDistance(resisted);
      if (resisted > 8) e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      const shouldRefresh = pullDistance >= PULL_TRIGGER;
      setPullDistance(0);
      if (shouldRefresh) handleSync();
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
    // pullDistance intentionally read at touchend via closure — re-attach when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pullDistance]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const filteredPlaces = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return bookmarkedPlaces;
    return bookmarkedPlaces.filter((p) => {
      const haystack = [
        p.name,
        p.address,
        p.city,
        p.state,
        p.country,
        p.streetAddress,
        p.postalCode,
        p.category,
        p.description,
        ...(p.keywords || []),
        ...(p.business_types || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [bookmarkedPlaces, debouncedQuery]);

  const handleRemoveBookmark = async (id: string) => {
    await removeBookmark(id);
    queryClient.invalidateQueries({ queryKey: ['bookmarked-businesses'] });
  };

  const handlePlaceClick = (placeId: string) => {
    navigate('/', { state: { selectedPlaceId: placeId } });
  };

  const indicatorVisible = isSyncing || pullDistance > 0;
  const indicatorTranslate = isSyncing ? 56 : pullDistance;
  const willTrigger = pullDistance >= PULL_TRIGGER;

  return (
    <AppLayout>
      <div
        ref={containerRef}
        className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 relative touch-pan-y"
        style={{
          transform: `translateY(${indicatorVisible ? Math.min(indicatorTranslate, PULL_MAX) : 0}px)`,
          transition: pullingRef.current ? 'none' : 'transform 220ms ease',
        }}
      >
        {/* Pull-to-refresh indicator */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-12 flex items-center gap-2 text-xs text-muted-foreground"
          aria-live="polite"
          aria-hidden={!indicatorVisible}
          style={{ opacity: indicatorVisible ? 1 : 0, transition: 'opacity 150ms ease' }}
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Syncing bookmarks…</span>
            </>
          ) : (
            <>
              <ArrowDown
                className={`h-4 w-4 transition-transform ${willTrigger ? 'rotate-180' : ''}`}
              />
              <span>{willTrigger ? 'Release to sync' : 'Pull to sync'}</span>
            </>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">My Bookmarks</h1>
          <p className="text-muted-foreground">
            Your saved Pi-accepting businesses. Pull down to sync.
          </p>
        </div>

        {!isLoading && bookmarkedPlaces.length > 0 && (
          <div className="relative max-w-lg mx-auto w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bookmarks by name, address, keyword..."
              className="pl-11 pr-10"
              aria-label="Search bookmarks"
            />
            {query !== debouncedQuery ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" aria-label="Searching" />
            ) : query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        )}

        {query && query !== debouncedQuery && (
          <p className="text-xs text-muted-foreground text-center -mt-2" aria-live="polite">Searching…</p>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-4 max-w-lg mx-auto" aria-busy="true" aria-live="polite">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading your bookmarks from the database…</span>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-2/5 rounded" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-44 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-5/6 rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16 rounded" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : bookmarkedPlaces.length === 0 ? (
          <Card className="w-full py-12 material-card" aria-live="polite">
            <CardContent className="text-center flex flex-col items-center space-y-4">
              <div className="p-3 bg-muted rounded-full">
                <BookmarkX className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No bookmarks yet</h3>
              <p className="text-muted-foreground max-w-md">
                We checked the database and didn't find any saved businesses on your account.
                Tap the bookmark icon on any place to save it here, or pull down to sync.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <Button onClick={() => navigate('/')}>Explore Map</Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredPlaces.length === 0 ? (
          <Card className="w-full py-8 material-card max-w-lg mx-auto">
            <CardContent className="text-center flex flex-col items-center space-y-3">
              <p className="text-muted-foreground">No bookmarks match "{query}".</p>
              <Button variant="outline" size="sm" onClick={() => setQuery('')}>Clear search</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col max-w-lg mx-auto divide-y divide-border">
            {filteredPlaces.map((place, index) => (
              <div
                key={place.id}
                style={{ animationDelay: `${index * 0.05}s` }}
                className="animate-fade-in py-4 first:pt-0 last:pb-0"
              >
                <PlaceCard
                  place={place}
                  onPlaceClick={handlePlaceClick}
                  onRemove={handleRemoveBookmark}
                  showDetails={true}
                  isBookmarked={true}
                  className="w-full"
                  hideGalleryIndicators
                  highlightQuery={debouncedQuery}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Bookmarks;
