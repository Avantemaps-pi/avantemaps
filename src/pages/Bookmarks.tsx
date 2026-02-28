import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PlaceCard from '@/components/business/PlaceCard';
import { useNavigate } from 'react-router-dom';
import { Place } from '@/types/business';
import { BookmarkX } from 'lucide-react';
import { useBusinessBookmarks } from '@/hooks/useBusinessBookmarks';
import { useBusinessData } from '@/hooks/useBusinessData';
import { Skeleton } from '@/components/ui/skeleton';

const Bookmarks = () => {
  const navigate = useNavigate();
  const { bookmarks: bookmarkIds, isLoading: bookmarksLoading, removeBookmark } = useBusinessBookmarks();
  const { places, isLoading: placesLoading } = useBusinessData();
  const [bookmarkedPlaces, setBookmarkedPlaces] = useState<Place[]>([]);

  useEffect(() => {
    if (!placesLoading && !bookmarksLoading) {
      const bookmarked = places.filter(place => 
        bookmarkIds.includes(place.id)
      );
      setBookmarkedPlaces(bookmarked);
    }
  }, [places, bookmarkIds, placesLoading, bookmarksLoading]);

  const isLoading = placesLoading || bookmarksLoading;
  const handleRemoveBookmark = async (id: string) => {
    await removeBookmark(id);
  };
  
  const handlePlaceClick = (placeId: string) => {
    navigate('/', {
      state: {
        selectedPlaceId: placeId
      }
    });
  };
  return <AppLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">My Bookmarks</h1>
          <p className="text-muted-foreground">Your saved Pi-accepting businesses.</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-4 max-w-lg mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-4 animate-pulse">
                <Skeleton className="h-44 w-full rounded-lg" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-2/5 rounded" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/5 rounded" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-md" />
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
              <Button className="mt-4" onClick={() => navigate('/recommendations')}>
                Explore Map
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4 max-w-lg mx-auto">
            {bookmarkedPlaces.map((place, index) => (
              <div key={place.id} style={{ animationDelay: `${index * 0.05}s` }} className="animate-fade-in">
                <PlaceCard 
                  place={place} 
                  onPlaceClick={handlePlaceClick} 
                  onRemove={handleRemoveBookmark} 
                  showDetails={false} 
                  isBookmarked={true}
                  className="w-full"
                  
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>;
};
export default Bookmarks;