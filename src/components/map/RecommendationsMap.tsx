
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MARKER_COLORS, defaultCenter, defaultZoom, OSM_TILE_LAYER } from './mapConfig';
import 'leaflet/dist/leaflet.css';
import { Place } from '@/data/mockPlaces';

interface RecommendationsMapProps {
  places: Place[];
  selectedPlaceId: string | null;
  onMarkerClick: (placeId: string) => void;
  detailCardRef?: React.RefObject<HTMLDivElement>;
  newBusinessData?: any;
}

// Simple MapViewUpdater component
const MapViewUpdater = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

const RecommendationsMap: React.FC<RecommendationsMapProps> = ({ 
  places, 
  selectedPlaceId,
  onMarkerClick,
  detailCardRef,
  newBusinessData
}) => {
  const [center, setCenter] = useState<{lat: number, lng: number}>(defaultCenter);
  const [zoom, setZoom] = useState(defaultZoom);
  const [userBusinesses, setUserBusinesses] = useState<Place[]>([]);
  
  // Fetch user businesses from Supabase
  useEffect(() => {
    const fetchUserBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('id, name, category, coordinates')
          .not('coordinates', 'is', null);
        
        if (error) {
          console.error('Error fetching user businesses:', error);
          return;
        }
        
        if (!data) {
          console.error('No data returned from Supabase');
          return;
        }
        
        // Transform the data into the Place format
        const formattedBusinesses = data
          .filter(business => business.coordinates) // Filter out any without coordinates
          .map(business => {
            try {
              // Parse coordinates from JSON string
              const coords = JSON.parse(business.coordinates || '{}');
              return {
                id: business.id.toString(),
                name: business.name,
                category: business.category || '',
                position: coords,
                address: '',
                isUserBusiness: true
              };
            } catch (e) {
              console.error("Failed to parse coordinates for business:", business.id);
              return null;
            }
          })
          .filter(Boolean) as Place[]; // Filter out any nulls from parsing errors
        
        setUserBusinesses(formattedBusinesses);
      } catch (error) {
        console.error('Error processing user businesses:', error);
      }
    };
    
    fetchUserBusinesses();
  }, []);
  
  // Combine mock places with user businesses
  const allPlaces = [...places, ...userBusinesses];
  
  // Add new business if provided
  useEffect(() => {
    if (newBusinessData && newBusinessData.position) {
      setCenter(newBusinessData.position);
      setZoom(15);
    }
  }, [newBusinessData]);

  // Find the selected place to center the map if needed
  useEffect(() => {
    if (selectedPlaceId) {
      const selectedPlace = allPlaces.find(place => place.id === selectedPlaceId);
      if (selectedPlace && selectedPlace.position) {
        setCenter(selectedPlace.position);
        setZoom(15); // Zoom in when a place is selected
        
        // Show a toast notification
        toast.info(`Viewing: ${selectedPlace.name}`, {
          description: selectedPlace.category,
          duration: 2000,
        });
      }
    }
  }, [selectedPlaceId, allPlaces]);

  return (
    <div className="w-full h-full relative">
      <MapContainer 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        className="leaflet-container"
      >
        <MapViewUpdater center={[center.lat, center.lng]} zoom={zoom} />
        
        <TileLayer
          url={OSM_TILE_LAYER.url}
        />
        
        {allPlaces.map((place) => (
          <Marker
            key={place.id}
            position={[place.position.lat, place.position.lng]}
            eventHandlers={{
              click: () => onMarkerClick(place.id)
            }}
          />
        ))}
        
        {/* If there's a new business being added, show it with a special marker */}
        {newBusinessData && newBusinessData.position && (
          <Marker
            position={[newBusinessData.position.lat, newBusinessData.position.lng]}
            eventHandlers={{
              click: () => {
                if (newBusinessData.id) {
                  onMarkerClick(newBusinessData.id.toString());
                }
              }
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default RecommendationsMap;
