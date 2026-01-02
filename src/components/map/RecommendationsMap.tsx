import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MARKER_COLORS, defaultCenter, defaultZoom, OSM_TILE_LAYER, worldBounds, maxBoundsViscosity } from './mapConfig';
import 'leaflet/dist/leaflet.css';
import { Place } from '@/types/business';

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
        // Use the secure function to get only public business info
        const { data, error } = await supabase
          .rpc('get_public_business_info');
        
        if (error) {
          console.error('Error fetching businesses:', error);
          return;
        }
        
        if (!data) {
          console.error('No data returned from Supabase');
          return;
        }
        
        // Transform the data into the Place format
        const formattedBusinesses = data
          .filter(business => {
            // Filter businesses with valid coordinates (either PostGIS or JSON)
            return (business.latitude && business.longitude) || business.coordinates;
          })
          .map(business => {
            // Use native PostGIS coordinates if available, fallback to JSON parsing
            let position = { lat: 37.7749, lng: -122.4194 };
            
            if (business.latitude !== undefined && business.longitude !== undefined && 
                business.latitude !== null && business.longitude !== null) {
              // Use native PostGIS coordinates (preferred)
              position = { lat: business.latitude, lng: business.longitude };
            } else if (business.coordinates) {
              // Fallback to JSON parsing for backward compatibility
              try {
                const coords = JSON.parse(business.coordinates || '{}');
                if (coords.lat && coords.lng) {
                  position = coords;
                }
              } catch (e) {
                console.error("Failed to parse coordinates:", e);
              }
            }
            
            return {
              id: business.id.toString(),
              name: business.name,
              category: business.category || '',
              position,
              address: business.location || '',
              description: business.description || '',
              isUserBusiness: true,
              streetAddress: business.street_address,
              city: business.city,
              state: business.state,
              postalCode: business.postal_code,
              country: business.country,
            };
          });
        
        // Filter out any businesses that might have failed
        const validBusinesses = formattedBusinesses.filter(b => b !== null) as Place[];
        
        setUserBusinesses(validBusinesses);
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
      }
    }
  }, [selectedPlaceId, allPlaces]);

  return (
    <div className="w-full h-full relative">
      <MapContainer 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        className="leaflet-container"
        bounds={worldBounds}
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
