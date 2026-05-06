import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PlaceCard from '@/components/business/PlaceCard';
import { useNavigate } from 'react-router-dom';
import { BookmarkX, Search, X } from 'lucide-react';
import { useBusinessBookmarks } from '@/hooks/useBusinessBookmarks';
import { useBookmarkedBusinesses } from '@/hooks/useBookmarkedBusinesses';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';

const Bookmarks = () => {
  const navigate = useNavigate();
  const { removeBookmark } = useBusinessBookmarks();
  const { bookmarkedPlaces, isLoading } = useBookmarkedBusinesses();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

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
    // Invalidate the bookmarked businesses cache
    queryClient.invalidateQueries({ queryKey: ['bookmarked-businesses'] });
  };

  const handlePlaceClick = (placeId: string) => {
    navigate('/', {
      state: { selectedPlaceId: placeId },
    });
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">My Bookmarks</h1>
          <p className="text-muted-foreground">Your saved Pi-accepting businesses.</p>
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
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-4 max-w-lg mx-auto">
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
          <Card className="w-full py-12 material-card">
            <CardContent className="text-center flex flex-col items-center space-y-4">
              <div className="p-3 bg-muted rounded-full">
                <BookmarkX className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No Bookmarks Yet</h3>
              <p className="text-muted-foreground max-w-md">You don't have any bookmarked places yet. Explore the map to find and save businesses.</p>
              <Button className="mt-4" onClick={() => navigate('/')}>
                Explore Map
              </Button>
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
