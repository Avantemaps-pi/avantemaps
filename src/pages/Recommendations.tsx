
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PlaceCard from '@/components/business/PlaceCard';
import RecommendationsMap from '@/components/map/RecommendationsMap';
import { useBusinessData } from '@/hooks/useBusinessData';
import { useIsMobile } from '@/hooks/use-mobile';
import ShareablePlaceSEO from '@/components/seo/ShareablePlaceSEO';
import '../styles/recommendations.css';

const Recommendations = () => {
  const { placeId } = useParams();
  const { places, isLoading, handleSearch } = useBusinessData();
  const [selectedPlace, setSelectedPlace] = useState<string | null>(placeId || null);
  const isMobile = useIsMobile();

  const handlePlaceClick = (id: string) => {
    setSelectedPlace(id);
  };

  // Handle URL parameter changes
  useEffect(() => {
    if (placeId) {
      setSelectedPlace(placeId);
    }
  }, [placeId]);

  // Find the selected place for SEO
  const selectedPlaceData = places.find(place => place.id === selectedPlace);

  return (
    <AppLayout 
      title="Recommendations" 
      onSearch={handleSearch}
      showSearch={true}
    >
      {/* Enhanced SEO metadata for shared recommendations */}
      {selectedPlaceData && (
        <ShareablePlaceSEO 
          place={selectedPlaceData} 
          isActive={true} 
          shareType="recommendations"
        />
      )}

      <div className="recommendations-container">
        <div className="recommendations-content">
          <div className="recommendations-sidebar">
            <div className="recommendations-header">
              <h1 className="text-2xl font-bold mb-4">Recommended Places</h1>
              <p className="text-muted-foreground mb-6">
                Discover amazing places curated just for you
              </p>
            </div>
            
            <div className="place-cards-container">
              {isLoading ? (
                <div className="loading-state">Loading recommendations...</div>
              ) : (
                places.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    onPlaceClick={handlePlaceClick}
                    className="recommendations-card"
                    showDetails={true}
                  />
                ))
              )}
            </div>
          </div>
          
          <div className="recommendations-map">
            <RecommendationsMap
              places={places}
              selectedPlaceId={selectedPlace}
              onMarkerClick={handlePlaceClick}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Recommendations;
