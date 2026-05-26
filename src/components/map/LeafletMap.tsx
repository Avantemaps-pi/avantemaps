import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Place } from '@/types/business';
import { toast } from 'sonner';
import { defaultCenter, defaultZoom, minZoom, maxZoom, OSM_TILE_LAYER, worldBounds, maxBoundsViscosity } from './mapConfig';
import MapMarkers from './map-components/MapMarkers';
import MapViewUpdater from './map-components/MapViewUpdater';
import CountryClickFocus from './map-components/CountryClickFocus';
import CountryZoomControl from './map-components/CountryZoomControl';
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
  suppressOverlay?: boolean;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ 
  places = [], 
  selectedPlaceId = null,
  onMarkerClick,
  detailCardRef,
  isLoading = false,
  suppressOverlay = false
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
      }
    } else {
      // Don't reset map center when closing overlay - keep user's current view
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

  // Throttle marker clicks to prevent rapid repeated UI events when users
  // click multiple markers in quick succession.
  const MARKER_CLICK_THROTTLE_MS = 250;
  const lastMarkerClickRef = useRef<{ id: string | null; ts: number }>({ id: null, ts: 0 });

  const handleMarkerClick = useCallback((id: string) => {
    const now = Date.now();
    const last = lastMarkerClickRef.current;
    // Drop the event if the same marker was clicked within the throttle window,
    // OR if any marker was clicked very recently (prevents UI thrashing).
    if (now - last.ts < MARKER_CLICK_THROTTLE_MS) {
      if (last.id === id) return; // exact duplicate — ignore
      // different marker but within window — still ignore to debounce
      return;
    }
    lastMarkerClickRef.current = { id, ts: now };

    if (suppressOverlay) {
      if (onMarkerClick) onMarkerClick(id);
      return;
    }
    setActiveMarker(id);
    setShowPopover(true);

    if (onMarkerClick) {
      onMarkerClick(id);
    }
  }, [onMarkerClick, suppressOverlay]);

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
        center={mapCenter}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        maxBounds={worldBounds}
        maxBoundsViscosity={maxBoundsViscosity}
      >
        <TileLayer 
          url={OSM_TILE_LAYER.url}
        />
        
        <MapViewUpdater center={mapCenter} zoom={zoom} />
        <CountryClickFocus />
        <CountryZoomControl />
        
        <MarkerClusterGroup
          chunkedLoading
          chunkInterval={200}
          chunkDelay={50}
          maxClusterRadius={60}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          removeOutsideVisibleBounds
          disableClusteringAtZoom={17}
          animate={displayPlaces.length < 500}
        >
          <MapMarkers places={displayPlaces} activeMarkerId={activeMarker} onMarkerClick={handleMarkerClick} />
        </MarkerClusterGroup>
      </MapContainer>
      
      {!suppressOverlay && (
        <PlaceOverlay 
          selectedPlace={selectedPlace} 
          showPopover={showPopover} 
          onOverlayClick={handleOverlayClick}
          detailCardRef={detailCardRef}
        />
      )}
    </div>
  );
};

export default LeafletMap;