import React, { useState, useEffect } from 'react';
import LeafletMap from '@/components/map/LeafletMap';
import { useBusinessData } from '@/hooks/useBusinessData';
import AddBusinessButton from '@/components/map/buttons/AddBusinessButton';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/map/SearchBar';
import { useSidebar } from '@/components/ui/sidebar';
import AvanteMapLogo from '@/components/layout/header/AvanteMapLogo';
import AppSidebar from '@/components/layout/AppSidebar'; // ✅ Import the sidebar
import '../styles/map.css';

const Index = () => {
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

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* ✅ Add the AppSidebar */}
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
