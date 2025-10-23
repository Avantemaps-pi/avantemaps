import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Place } from '@/types/business';
import { toast } from 'sonner';
import { defaultCenter, defaultZoom, OSM_TILE_LAYER, worldBounds, maxBoundsViscosity } from './mapConfig';
import MapMarkers from './map-components/MapMarkers';
import MapViewUpdater from './map-components/MapViewUpdater';
import PlaceOverlay from './map-components/PlaceOverlay';
import LoadingOverlay from './map-components/LoadingOverlay';
import EmptyMapState from './EmptyMapState';
import { LatLngTuple } from 'leaflet';
import '@/lib/fix-leaflet-icons';
import MarkerClusterGroup from 'react-leaflet-cluster';

interface LeafletMapProps {
  places?: Place[]; 
  selectedPlaceId?: string | null; 
  onMarkerClick?: (placeId: string) => void; 
  detailCardRef?: React.RefObject<HTMLDivElement>; 
  isLoading?: boolean; 
}

const LeafletMap: React.FC<LeafletMapProps> = ({ 
  places = [], 
  selectedPlaceId = null,
  onMarkerClick,
  detailCardRef,
  isLoading = false
}) => {
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [mapCenter, setMapCenter] = useState<LatLngTuple>([defaultCenter.lat, defaultCenter.lng]); // San Francisco by default
  const [zoom, setZoom] = useState(defaultZoom);

  // Use provided places - memoized to prevent infinite re-renders
  const displayPlaces = useMemo(() => {
    if (isLoading) return [];
    return places;
  }, [places, isLoading]);

  // Signal that the map is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('app-ready'));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Ensure map centers on San Francisco or a selected place, and handle zoom accordingly
  useEffect(() => {
    if (selectedPlaceId) {
      const selectedPlace = displayPlaces.find(place => place.id === selectedPlaceId);
      if (selectedPlace && selectedPlace.position) {
        setMapCenter([selectedPlace.position.lat, selectedPlace.position.lng]);
        setZoom(15);
        setActiveMarker(selectedPlaceId);
        setShowPopover(true);

        toast.info(`Viewing: ${selectedPlace.name}`, {
          description: selectedPlace.category,
          duration: 2000,
        });
      }
    } else {
      setMapCenter([defaultCenter.lat, defaultCenter.lng]);
      setActiveMarker(null);
      setShowPopover(false);
    }
  }, [selectedPlaceId, displayPlaces]);

  // Listen for zoom to place events
  useEffect(() => {
    const handleZoomToPlace = (event: CustomEvent) => {
      const { placeId, zoom: shouldZoom } = event.detail;
      if (shouldZoom && placeId) {
        const selectedPlace = displayPlaces.find(place => place.id === placeId);
        if (selectedPlace && selectedPlace.position) {
          setMapCenter([selectedPlace.position.lat, selectedPlace.position.lng]);
          setZoom(19); // Maximum zoom level
          setActiveMarker(placeId);
          setShowPopover(true);

          toast.info(`Zoomed to: ${selectedPlace.name}`, {
            description: selectedPlace.address,
            duration: 2000,
          });
        }
      }
    };

    const handleCenterMap = (event: CustomEvent) => {
      const { lat, lng, zoom: newZoom } = event.detail;
      if (lat && lng) {
        setMapCenter([lat, lng]);
        if (newZoom) {
          setZoom(newZoom);
        }
      }
    };

    window.addEventListener('zoomToPlace', handleZoomToPlace as EventListener);
    window.addEventListener('centerMap', handleCenterMap as EventListener);
    return () => {
      window.removeEventListener('zoomToPlace', handleZoomToPlace as EventListener);
      window.removeEventListener('centerMap', handleCenterMap as EventListener);
    };
  }, [displayPlaces]);

  const handleMarkerClick = (id: string) => {
    setActiveMarker(id);
    setShowPopover(true);
    
    if (onMarkerClick) {
      onMarkerClick(id);
    }
  };

  const handleOverlayClick = () => {
    setActiveMarker(null);
    setShowPopover(false);
    
    if (onMarkerClick) {
      onMarkerClick("");
    }
  };

  const selectedPlace = activeMarker ? displayPlaces.find(place => place.id === activeMarker) : null;

  return (
    <div className="w-full h-full relative">
      {isLoading && <LoadingOverlay />}
      {!isLoading && displayPlaces.length === 0 && <EmptyMapState />}
      
      <MapContainer 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        className="leaflet-container"
        bounds={worldBounds}
      >
        <TileLayer 
          url={OSM_TILE_LAYER.url}
        />
        
        <MapViewUpdater center={mapCenter} zoom={zoom} />
        
        <MarkerClusterGroup>
          <MapMarkers places={displayPlaces} activeMarkerId={activeMarker} onMarkerClick={handleMarkerClick} />
        </MarkerClusterGroup>
      </MapContainer>
      
      <PlaceOverlay 
        selectedPlace={selectedPlace} 
        showPopover={showPopover} 
        onOverlayClick={handleOverlayClick}
        detailCardRef={detailCardRef}
      />
    </div>
  );
};

export default LeafletMap;