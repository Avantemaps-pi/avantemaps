
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useBusinessData } from '@/hooks/useBusinessData';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/map/SearchBar';
import { useSidebar } from '@/components/ui/sidebar';
import AvanteMapLogo from '@/components/layout/header/AvanteMapLogo';
import AppSidebar from '@/components/layout/AppSidebar';
import PlaceCardSEO from '@/components/seo/PlaceCardSEO';
import MetaTags from '@/components/seo/MetaTags';
import { BusinessSuggestion } from '@/hooks/useBusinessAutocomplete';
import { useSearchTracking } from '@/hooks/useSearchTracking';
import '../styles/map.css';

const LeafletMap = lazy(() => import('@/components/map/LeafletMap'));
const AddBusinessButton = lazy(() => import('@/components/map/buttons/AddBusinessButton'));

const Index = () => {
  const location = useLocation();
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { places = [], filteredPlaces = [], isLoading = false, handleSearch } = useBusinessData();
  const { setOpenMobile } = useSidebar();
  const { trackBusinessSearch } = useSearchTracking();

  const handlePlaceClick = (placeId: string, zoomToLocation?: boolean) => {
    setSelectedPlace(placeId);
    if (zoomToLocation) {
      // Trigger zoom event
      window.dispatchEvent(new CustomEvent('zoomToPlace', { detail: { placeId, zoom: true } }));
    }
  };
  
  const handleMenuClick = () => {
    setOpenMobile(true);
  };

  const handlePlaceSelect = (place: { name: string; lat: number; lng: number }) => {
    // Center the map on the selected place
    window.dispatchEvent(new CustomEvent('centerMap', { 
      detail: { lat: place.lat, lng: place.lng, zoom: 15 } 
    }));
  };

  const handleBusinessSelect = (business: BusinessSuggestion) => {
    // Track the business search for personalized recommendations
    trackBusinessSearch(Number(business.id), business.name);
    
    // Set selected place and zoom to it
    setSelectedPlace(business.id);
    window.dispatchEvent(new CustomEvent('centerMap', { 
      detail: { lat: business.lat, lng: business.lng, zoom: 16 } 
    }));
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    handleSearch(term);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Handle shared place URLs
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedPlaceId = urlParams.get('place');
    const stateSelectedPlaceId = location.state?.selectedPlaceId;
    const shouldZoom = location.state?.zoomToLocation;
    
    if (sharedPlaceId) {
      setSelectedPlace(sharedPlaceId);
    } else if (stateSelectedPlaceId) {
      setSelectedPlace(stateSelectedPlaceId);
      if (shouldZoom) {
        // Trigger zoom event with a slight delay to ensure map is ready
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('zoomToPlace', { detail: { placeId: stateSelectedPlaceId, zoom: true } }));
        }, 300);
      }
    }
  }, [location]);

  // Find the selected place for SEO
  const selectedPlaceData = [...places, ...filteredPlaces].find(place => place.id === selectedPlace);

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* SEO metadata */}
      {selectedPlaceData ? (
        <PlaceCardSEO place={selectedPlaceData} isActive={true} />
      ) : (
        <MetaTags
          title="Discover Local Businesses"
          description="Find and explore local businesses on Avante Maps. Register your business, get discovered by customers, and transact with Pi cryptocurrency."
          keywords={['pi network', 'local businesses', 'business directory', 'cryptocurrency', 'pi payment', 'avante maps', 'business map']}
          authors={[{ name: 'Avante Maps Team' }]}
          ogType="website"
          ogImage={{
            url: `${window.location.origin}/og-image.png`,
            secure_url: `${window.location.origin}/og-image.png`,
            type: 'image/png',
            width: 1200,
            height: 630,
            alt: 'Avante Maps - Local Business Discovery'
          }}
          twitter={{
            card: 'summary_large_image',
            site: '@AvanteMap',
            title: 'Avante Maps - Discover Local Businesses',
            description: 'Find local businesses and pay with Pi Network',
            image: `${window.location.origin}/og-image.png`,
            image_alt: 'Avante Maps Preview'
          }}
          structuredData={{
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            'name': 'Avante Maps',
            'description': 'Local business discovery platform powered by Pi Network',
            'url': window.location.origin,
            'applicationCategory': 'BusinessApplication',
            'operatingSystem': 'Web',
            'offers': {
              '@type': 'Offer',
              'category': 'Subscription'
            }
          }}
        />
      )}

      <AppSidebar />

      {/* Map container with consistent sizing across all screens */}
      <div className="absolute inset-0 w-full h-full">
        <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
          <LeafletMap
            places={filteredPlaces.length > 0 ? filteredPlaces : places}
            selectedPlaceId={selectedPlace}
            onMarkerClick={handlePlaceClick}
            isLoading={isLoading}
          />
        </Suspense>
      </div>
      
      {/* Floating UI - responsive positioning with proper spacing for sidebar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-2 sm:px-4 md:pl-[280px] lg:pl-[280px] py-2 sm:py-4 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMenuClick}
          className="mr-2 bg-white/80 shadow-sm flex-shrink-0 sm:hidden"
        >
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        
        <div className="mr-2 flex-shrink-0 md:hidden">
          <AvanteMapLogo size="small" />
        </div>
        
        <div className="flex-1 max-w-xs sm:max-w-md md:max-w-lg mx-auto md:ml-6 lg:ml-8">
          <div className="space-y-2">
            <SearchBar 
              onSearch={handleSearchChange}
              onPlaceSelect={handlePlaceSelect}
              onBusinessSelect={handleBusinessSelect}
              enableAutocomplete={true}
              autocompleteMode="business"
              businesses={places}
              placeholders={[
                "Search for Business name", 
                "Search by Category", 
                "Search by Keywords"
              ]} 
              cycleInterval={3000} 
            />
            {searchTerm && filteredPlaces.length === 0 && !isLoading && (
              <div className="bg-background/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm border border-border">
                <p className="text-sm text-muted-foreground">no businesses found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Suspense fallback={null}>
        <AddBusinessButton selectedPlace={selectedPlace} />
      </Suspense>
    </div>
  );
};

export default Index;
