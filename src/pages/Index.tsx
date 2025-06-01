
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
    // Check if there's a shared place ID in the URL
    const urlParams = new URLSearchParams(location.search);
    const sharedPlaceId = urlParams.get('place');
    const stateSelectedPlaceId = location.state?.selectedPlaceId;
    
    if (sharedPlaceId) {
      setSelectedPlace(sharedPlaceId);
    } else if (stateSelectedPlaceId) {
      setSelectedPlace(stateSelectedPlaceId);
    }
  }, [location]);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Find the selected place for SEO
  const selectedPlaceData = selectedPlace 
    ? places.find(place => place.id === selectedPlace) || filteredPlaces.find(place => place.id === selectedPlace)
    : null;

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* SEO component for shared place cards */}
      {selectedPlaceData && <PlaceCardSEO place={selectedPlaceData} />}
      
      <AppSidebar />

      <LeafletMap
        places={filteredPlaces.length > 0 ? filteredPlaces : places}
        selectedPlaceId={selectedPlace}
        onMarkerClick={handlePlaceClick}
        isLoading={isLoading}
      />
      
      {/* Floating UI */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-4 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMenuClick}
          className="mr-2 bg-white/80 shadow-sm"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="mr-2">
          <AvanteMapLogo size="small" />
        </div>
        
        <div className="flex-1 max-w-md mx-auto">
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
