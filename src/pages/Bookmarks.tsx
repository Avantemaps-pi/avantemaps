import React, { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PlaceCard from '@/components/business/PlaceCard';
import { useNavigate } from '@/lib/router-compat';
import { AlertCircle, ArrowDown, Bookmark, Loader2, Search, SearchX, X } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessBookmarks } from '@/hooks/useBusinessBookmarks';
import { useBookmarkedBusinesses } from '@/hooks/useBookmarkedBusinesses';
import { StateBlock } from '@/components/ui/state-block';
import BusinessCardSkeleton from '@/components/business/BusinessCardSkeleton';
import { useQueryClient } from '@tanstack/react-query';

const PULL_TRIGGER = 70; // px to trigger refresh
const PULL_MAX = 110;    // px max visual pull

const Bookmarks = () => {
  const navigate = useNavigate();
  const { removeBookmark } = useBusinessBookmarks();
  const { bookmarkedPlaces, isLoading, isError, refetch } = useBookmarkedBusinesses();
  const [retrying, setRetrying] = useState(false);
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
      await queryClient.invalidateQueries({ queryKey: ['bookmarked-businesses'], exact: true });
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
      const touch = e.touches[0];
      if (!touch) return;
      startYRef.current = touch.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dy = touch.clientY - startYRef.current;
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
    queryClient.invalidateQueries({ queryKey: ['bookmarked-businesses'], exact: true });
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await refetch();
    } finally {
      setRetrying(false);
    }
  };

  // One page state, and exactly one UI for it. A refetch with no data goes back to
  // loading, so keep the error up while Try again runs.
  const pageState: 'loading' | 'error' | 'none' | 'no-match' | 'ok' =
    retrying && bookmarkedPlaces.length === 0
      ? 'error'
      : isLoading
        ? 'loading'
        : isError && bookmarkedPlaces.length === 0
          ? 'error'
          : bookmarkedPlaces.length === 0
            ? 'none'
            : filteredPlaces.length === 0
              ? 'no-match'
              : 'ok';

  const handlePlaceClick = (placeId: string) => {
    navigate('/', { state: { selectedPlaceId: placeId } });
  };

  const indicatorVisible = isSyncing || pullDistance > 0;
  const indicatorTranslate = isSyncing ? 56 : pullDistance;
  const willTrigger = pullDistance >= PULL_TRIGGER;

  // Announce discrete state changes to assistive tech without spamming
  // every pixel of pull movement.
  const [srStatus, setSrStatus] = useState('');
  useEffect(() => {
    if (isSyncing) {
      setSrStatus('Syncing bookmarks');
      return;
    }
    if (pullDistance === 0) {
      // Cleared after a sync completes
      setSrStatus((prev) => (prev === 'Syncing bookmarks' ? 'Bookmarks synced' : ''));
      return;
    }
    setSrStatus(willTrigger ? 'Release to sync bookmarks' : 'Pull down to sync bookmarks');
  }, [isSyncing, willTrigger, pullDistance]);

  return (
    <AppLayout>
      {/* Keyboard / AT-accessible sync trigger — visually hidden until focused.
          Pull-to-refresh is a touch gesture, so this provides an equivalent
          control for keyboard and screen reader users. */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isSyncing}
        className="sr-only focus:not-sr-only focus:fixed focus:top-20 focus:left-1/2 focus:-translate-x-1/2 focus:z-50"
      >
        {isSyncing ? 'Syncing bookmarks…' : 'Sync bookmarks'}
      </Button>

      {/* Polite live region for screen readers — separate from the visual
          indicator so we can announce discrete state transitions only. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {srStatus}
      </div>

      <section
        ref={containerRef}
        aria-labelledby="page-title"
        className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-6 space-y-4 sm:space-y-5 relative touch-pan-y"
        style={{
          transform: `translateY(${indicatorVisible ? Math.min(indicatorTranslate, PULL_MAX) : 0}px)`,
          transition: pullingRef.current ? 'none' : 'transform 220ms ease',
        }}
      >
        {/* Visual pull-to-refresh indicator. Hidden from assistive tech —
            the sr-only live region above provides the accessible announcement. */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-12 flex items-center gap-2 text-xs text-muted-foreground"
          aria-hidden="true"
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

        {!isLoading && bookmarkedPlaces.length > 0 && (
          <div className="relative max-w-lg mx-auto w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved businesses"
              className="h-11 sm:h-11 rounded-full border-input pl-10 pr-12 text-base"
              aria-label="Search bookmarks"
            />
            {query !== debouncedQuery ? (
              <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" aria-label="Searching" />
            ) : query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-0 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
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

        {pageState === 'loading' && (
          <div role="status" className="flex flex-col gap-4 max-w-lg mx-auto">
            <span className="sr-only">Loading businesses…</span>
            <BusinessCardSkeleton />
            <BusinessCardSkeleton />
            <BusinessCardSkeleton />
          </div>
        )}
        {pageState === 'error' && (
          <StateBlock
            kind="error"
            icon={AlertCircle}
            title="Couldn't load your saved businesses"
            body="Check your connection, then try again."
            action={{ label: 'Try again', onClick: handleRetry, loading: retrying }}
          />
        )}
        {pageState === 'none' && (
          <StateBlock
            kind="empty"
            icon={Bookmark}
            title="No saved businesses yet"
            body="Tap the bookmark on any business to keep it here."
            action={{ label: 'Explore the map', onClick: () => navigate('/') }}
          />
        )}
        {pageState === 'no-match' && (
          <StateBlock
            kind="empty"
            icon={SearchX}
            title={`No saved businesses match "${debouncedQuery.trim()}"`}
            body="Check the spelling or try another word."
            action={{ label: 'Clear search', onClick: () => setQuery('') }}
          />
        )}
        {pageState === 'ok' && (
          <div className="flex flex-col gap-4 max-w-lg mx-auto">
            {filteredPlaces.map((place, index) => (
              <div
                key={place.id}
                style={{ animationDelay: `${index * 0.05}s` }}
                className="motion-safe:animate-fade-in"
              >
                <PlaceCard
                  place={place}
                  onPlaceClick={handlePlaceClick}
                  onRemove={handleRemoveBookmark}
                  isBookmarked={true}
                  className="w-full"
                  highlightQuery={debouncedQuery}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
};

export default Bookmarks;
