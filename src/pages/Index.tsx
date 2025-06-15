
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LeafletMap from '@/components/map/LeafletMap';
import { useBusinessData } from '@/hooks/useBusinessData';
import AddBusinessButton from '@/components/map/buttons/AddBusinessButton';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/map/SearchBar';
import { useSidebar } from '@/components/ui/sidebar';
import AvanteMapLogo from '@/components/layout/header/AvanteMapLogo';
import AppSidebar from '@/components/layout/AppSidebar';
import PlaceCardSEO from '@/components/seo/PlaceCardSEO';
import '../styles/map.css';

const Index = () => {
  const location = useLocation();
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const { places = [], filteredPlaces = [], isLoading = false, handleSearch } = useBusinessData();
  const { setOpenMobile } = useSidebar();

  const handlePlaceClick = (placeId: string) => {
    setSelectedPlace(placeId);
  };
  
  const handleMenuClick = () => {
    setOpenMobile(true);
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
    
    if (sharedPlaceId) {
      setSelectedPlace(sharedPlaceId);
    } else if (stateSelectedPlaceId) {
      setSelectedPlace(stateSelectedPlaceId);
    }
  }, [location]);

  // Find the selected place for SEO
  const selectedPlaceData = [...places, ...filteredPlaces].find(place => place.id === selectedPlace);

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* SEO metadata for shared place */}
      {selectedPlaceData && (
        <PlaceCardSEO place={selectedPlaceData} isActive={true} />
      )}

      <AppSidebar />

      {/* Map container with consistent sizing across all screens */}
      <div className="absolute inset-0 w-full h-full">
        <LeafletMap
          places={filteredPlaces.length > 0 ? filteredPlaces : places}
          selectedPlaceId={selectedPlace}
          onMarkerClick={handlePlaceClick}
          isLoading={isLoading}
        />
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
          <SearchBar 
            onSearch={handleSearch} 
            placeholders={[
              "Search for Address", 
              "Search for Business name", 
              "Search for Business Type", 
              "Search for Keywords"
            ]} 
            cycleInterval={3000} 
          />
        </div>
      </div>
      
      <AddBusinessButton selectedPlace={selectedPlace} />
    </div>
  );
};

export default Index;
