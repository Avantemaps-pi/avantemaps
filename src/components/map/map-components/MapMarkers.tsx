import React, { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Place } from '@/types/business';
import L, { LatLngTuple } from 'leaflet';
import { createMarkerIcon } from '../markerUtils';

interface MapMarkersProps {
  places: Place[];
  activeMarkerId: string | null;
  onMarkerClick: (id: string) => void;
}

const MapMarkers: React.FC<MapMarkersProps> = ({ places, activeMarkerId, onMarkerClick }) => {
  const markerIcons = useMemo(() => {
    const iconMap = new Map<string, L.Icon | L.DivIcon>();
    places.forEach(place => {
      const lat = place.position ? place.position.lat : (place.location ? place.location.lat : undefined);
      const lng = place.position ? place.position.lng : (place.location ? place.location.lng : undefined);
      if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
        iconMap.set(place.id, createMarkerIcon({
          isActive: activeMarkerId === place.id,
          isUserBusiness: place.isUserBusiness || false,
          isVerified: place.isVerified || false,
          isCertified: place.isCertified || false,
          verificationStatus: place.verificationStatus,
        }));
      }
    });
    return iconMap;
  }, [places, activeMarkerId]);

  return (
    <>
      {places.map(place => {
        // Check for both position and location properties to handle different place formats
        const lat = place.position ? place.position.lat : (place.location ? place.location.lat : undefined);
        const lng = place.position ? place.position.lng : (place.location ? place.location.lng : undefined);
        
        // Only create marker if coordinates are valid numbers
        if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
          const position: LatLngTuple = [lat, lng];
          const markerIcon = markerIcons.get(place.id);
          
          return (
            <Marker
              key={place.id}
              position={position}
              icon={markerIcon}
              eventHandlers={{
                click: () => onMarkerClick(place.id)
              }}
            >
              <Popup>{place.name}</Popup>
            </Marker>
          );
        }
        return null;
      })}
    </>
  );
};

export default React.memo(MapMarkers, (prev, next) => {
  return (
    prev.activeMarkerId === next.activeMarkerId &&
    prev.onMarkerClick === next.onMarkerClick &&
    prev.places === next.places
  );
});
