
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useBusinessData } from '@/hooks/useBusinessData';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/map/SearchBar';
import CategoryFilter, { CATEGORY_OPTIONS } from '@/components/map/CategoryFilter';
import LocateMeButton from '@/components/map/buttons/LocateMeButton';
import { useSidebar } from '@/components/ui/sidebar';
import AvanteMapLogo from '@/components/layout/header/AvanteMapLogo';
import AppSidebar from '@/components/layout/AppSidebar';
import BottomNavBar from '@/components/layout/BottomNavBar';
import PlaceCardSEO from '@/components/seo/PlaceCardSEO';
import MetaTags from '@/components/seo/MetaTags';
import { BusinessSuggestion } from '@/hooks/useBusinessAutocomplete';
import { useSearchTracking } from '@/hooks/useSearchTracking';
import { useAuth } from '@/context/auth/useAuth';
import LandingPage from './LandingPage';
import { useIpLocationFocus } from '@/hooks/useIpLocationFocus';
import '../styles/map.css';

const LeafletMap = lazy(() => import('@/components/map/LeafletMap'));
const AddBusinessButton = lazy(() => import('@/components/map/buttons/AddBusinessButton'));

const Index = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const { places = [], filteredPlaces = [], isLoading = false, handleSearch } = useBusinessData();
  const { setOpenMobile } = useSidebar();
  const { trackBusinessSearch } = useSearchTracking();

  // After login, focus the map on the user's approximate IP location (cached, once per session)
  useIpLocationFocus(isAuthenticated && !authLoading);

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

  // Apply category filter on top of search filter
  const basePlaces = filteredPlaces.length > 0 || searchTerm ? filteredPlaces : places;
  const visiblePlaces = React.useMemo(() => {
    if (selectedCategoryId === 'all') return basePlaces;
    const opt = CATEGORY_OPTIONS.find(o => o.id === selectedCategoryId);
    if (!opt || opt.match.length === 0) return basePlaces;
    return basePlaces.filter(p => {
      const haystack = [
        p.category,
        ...(p.business_types || []),
        ...(p.keywords || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return opt.match.some(m => haystack.includes(m));
    });
  }, [basePlaces, selectedCategoryId]);

  // Find the selected place for SEO
  const selectedPlaceData = [...places, ...filteredPlaces].find(place => place.id === selectedPlace);

  // Show landing page for unauthenticated users
  if (!isAuthenticated && !authLoading) {
    return <LandingPage />;
  }

  // Show loading only when not yet authenticated and still loading
  if (!isAuthenticated && authLoading) {
    return <div className="w-full h-screen bg-muted animate-pulse" />;
  }

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
            places={visiblePlaces}
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
            {!isLoading && visiblePlaces.length === 0 && (searchTerm || selectedCategoryId !== 'all') && (() => {
              const categoryLabel = CATEGORY_OPTIONS.find(o => o.id === selectedCategoryId)?.label;
              const hasSearch = !!searchTerm;
              const hasCategory = selectedCategoryId !== 'all';
              const searchHasMatchesInAll = hasSearch && filteredPlaces.length > 0;
              let reason = '';
              if (hasSearch && hasCategory) {
                reason = searchHasMatchesInAll
                  ? `No results for "${searchTerm}" in ${categoryLabel}. Matches exist in other categories.`
                  : `No businesses match "${searchTerm}" in ${categoryLabel}.`;
              } else if (hasSearch) {
                reason = `No businesses match "${searchTerm}".`;
              } else {
                reason = `No businesses found in ${categoryLabel}.`;
              }
              return (
                <div className="bg-background/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-sm border border-border flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">No matching businesses</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{reason}</p>
                  </div>
                  {hasCategory && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-shrink-0"
                      onClick={() => setSelectedCategoryId('all')}
                    >
                      Show All
                    </Button>
                  )}
                </div>
              );
            })()}
            <CategoryFilter
              selectedCategoryId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          </div>
        </div>
      </div>
      
      <Suspense fallback={null}>
        <AddBusinessButton selectedPlace={selectedPlace} />
      </Suspense>
      <LocateMeButton className="absolute right-6 bottom-36 sm:bottom-20 z-20" />
      <BottomNavBar />
    </div>
  );
};

export default Index;
