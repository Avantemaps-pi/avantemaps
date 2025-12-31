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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="w-full">
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
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
          <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
            {bookmarkedPlaces.map((place, index) => (
              <div key={place.id} style={{ animationDelay: `${index * 0.05}s` }} className="animate-fade-in flex-none w-80">
                <PlaceCard 
                  place={place} 
                  onPlaceClick={handlePlaceClick} 
                  onRemove={handleRemoveBookmark} 
                  showDetails={false} 
                  isBookmarked={true}
                  className="w-full h-full"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>;
};
export default Bookmarks;