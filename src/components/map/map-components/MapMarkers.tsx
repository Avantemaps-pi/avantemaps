import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Place } from '@/types/business';
import { LatLngTuple } from 'leaflet';
import { createMarkerIcon } from '../markerUtils';

interface MapMarkersProps {
  places: Place[];
  activeMarkerId: string | null;
  onMarkerClick: (id: string) => void;
}

const MapMarkers: React.FC<MapMarkersProps> = ({ places, activeMarkerId, onMarkerClick }) => {
  return (
    <>
      {places.map(place => {
        // Check for both position and location properties to handle different place formats
        const lat = place.position ? place.position.lat : (place.location ? place.location.lat : undefined);
        const lng = place.position ? place.position.lng : (place.location ? place.location.lng : undefined);
        
        // Only create marker if coordinates are valid numbers
        if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
          const position: LatLngTuple = [lat, lng];
          const isActive = activeMarkerId === place.id;
          
          // Create marker icon with verification status
          const markerIcon = createMarkerIcon({
            isActive,
            isUserBusiness: place.isUserBusiness || false,
            isVerified: place.isVerified || false,
            isCertified: place.isCertified || false,
          });
          
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

export default MapMarkers;
