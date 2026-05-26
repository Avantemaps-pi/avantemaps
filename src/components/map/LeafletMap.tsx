import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
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
import { LatLngTuple, LatLngBounds } from 'leaflet';
import '@/lib/fix-leaflet-icons';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface BoundsBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

const boundsToBox = (b: LatLngBounds): BoundsBox => ({
  north: b.getNorth(),
  south: b.getSouth(),
  east: b.getEast(),
  west: b.getWest(),
});

const boxesEqual = (a: BoundsBox | null, b: BoundsBox | null) => {
  if (!a || !b) return a === b;
  const eps = 1e-5;
  return (
    Math.abs(a.north - b.north) < eps &&
    Math.abs(a.south - b.south) < eps &&
    Math.abs(a.east - b.east) < eps &&
    Math.abs(a.west - b.west) < eps
  );
};

const isInBox = (lat: number, lng: number, b: BoundsBox) => {
  if (lat > b.north || lat < b.south) return false;
  // handle antimeridian crossing
  if (b.west <= b.east) {
    return lng >= b.west && lng <= b.east;
  }
  return lng >= b.west || lng <= b.east;
};

const ViewportTracker: React.FC<{ onChange: (b: BoundsBox) => void }> = ({ onChange }) => {
  const map = useMapEvents({
    moveend: () => onChange(boundsToBox(map.getBounds())),
    zoomend: () => onChange(boundsToBox(map.getBounds())),
  });
  useEffect(() => {
    onChange(boundsToBox(map.getBounds()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

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
  const [viewportBounds, setViewportBounds] = useState<BoundsBox | null>(null);
  const [searchBounds, setSearchBounds] = useState<BoundsBox | null>(null);

  // Use provided places - memoized to prevent infinite re-renders
  const displayPlaces = useMemo(() => {
    if (isLoading) return [];
    if (!searchBounds) return places;
    return places.filter(
      (p) => p.position && isInBox(p.position.lat, p.position.lng, searchBounds)
    );
  }, [places, isLoading, searchBounds]);

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

  const totalInView = useMemo(() => {
    if (!viewportBounds) return places.length;
    return places.filter(
      (p) => p.position && isInBox(p.position.lat, p.position.lng, viewportBounds)
    ).length;
  }, [places, viewportBounds]);

  const showSearchHereButton =
    !isLoading && viewportBounds && !boxesEqual(viewportBounds, searchBounds);

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
        <ViewportTracker onChange={setViewportBounds} />
        
        <MarkerClusterGroup>
          <MapMarkers places={displayPlaces} activeMarkerId={activeMarker} onMarkerClick={handleMarkerClick} />
        </MarkerClusterGroup>
      </MapContainer>

      {/* Search this area / clear filter controls */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 pointer-events-none">
        {showSearchHereButton && (
          <Button
            size="sm"
            onClick={() => viewportBounds && setSearchBounds(viewportBounds)}
            className="pointer-events-auto shadow-md gap-1.5"
          >
            <Search className="h-3.5 w-3.5" />
            Search this area
            {totalInView > 0 && (
              <span className="ml-1 text-xs opacity-80">({totalInView})</span>
            )}
          </Button>
        )}
        {searchBounds && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSearchBounds(null)}
            className="pointer-events-auto shadow-md gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Clear area filter
          </Button>
        )}
      </div>
      
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