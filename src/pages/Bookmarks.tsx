import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PlaceCard from '@/components/business/PlaceCard';
import { useNavigate } from 'react-router-dom';
import { Place } from '@/data/mockPlaces';
import { BookmarkX } from 'lucide-react';
const bookmarkedPlaces: Place[] = [{
  id: '1',
  name: 'Pi Cafe Downtown',
  address: '123 Main St, San Francisco, CA',
  category: 'Cafe',
  description: 'A cozy cafe that accepts Pi payments for coffee, pastries and light meals. Great atmosphere for working or meeting friends.',
  image: '/placeholder.svg',
  rating: 4.5,
  website: 'https://picafedowntown.com',
  position: {
    lat: 37.773,
    lng: -122.413
  }
}, {
  id: '2',
  name: 'Pi Tech Store',
  address: '456 Market St, San Francisco, CA',
  category: 'Technology',
  description: 'Electronics and gadgets store that accepts Pi cryptocurrency. Offers repairs and accessories for all major brands.',
  image: '/placeholder.svg',
  rating: 4.2,
  website: 'https://pitechstore.com',
  position: {
    lat: 37.789,
    lng: -122.401
  }
}, {
  id: '3',
  name: 'Pi Bakery',
  address: '789 Mission St, San Francisco, CA',
  category: 'Food',
  description: 'Artisanal bakery with fresh bread, pastries and cakes. Uses local ingredients and accepts Pi for all purchases.',
  image: '/placeholder.svg',
  rating: 4.7,
  website: 'https://pibakery.com',
  position: {
    lat: 37.785,
    lng: -122.405
  }
}];
const Bookmarks = () => {
  const [bookmarks, setBookmarks] = React.useState(bookmarkedPlaces);
  const navigate = useNavigate();
  const removeBookmark = (id: string) => {
    setBookmarks(bookmarks.filter(bookmark => bookmark.id !== id));
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
          
          <p className="text-muted-foreground">Your saved Pi-accepting businesses.</p>
        </div>

        {bookmarks.length === 0 ? <Card className="w-full py-12 material-card">
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
          </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarks.map((place, index) => <div key={place.id} style={{
          animationDelay: `${index * 0.05}s`
        }} className="animate-fade-in">
                <PlaceCard place={place} onPlaceClick={handlePlaceClick} onRemove={removeBookmark} showDetails={false} isBookmarked={true} />
              </div>)}
          </div>}
      </div>
    </AppLayout>;
};
export default Bookmarks;