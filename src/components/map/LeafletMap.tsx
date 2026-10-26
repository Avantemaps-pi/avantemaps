import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, AttributionControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Place } from '@/types/business';
import { toast } from 'sonner';
import { defaultCenter, defaultZoom, minZoom, maxZoom, OSM_TILE_LAYER, worldBounds, maxBoundsViscosity } from './mapConfig';
import MapMarkers from './map-components/MapMarkers';
import MapViewUpdater from './map-components/MapViewUpdater';
import CountryClickFocus from './map-components/CountryClickFocus';
import CountryZoomControl from './map-components/CountryZoomControl';
import PlaceOverlay from './map-components/PlaceOverlay';
import StripMapSync from './map-components/StripMapSync';
import L, { LatLngTuple } from 'leaflet';
import '@/lib/fix-leaflet-icons';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';
import {
  canAutoCentreWithGps,
  markGranted,
  clearGranted,
  GPS_AUTOCENTRE_FAILED_KEY,
  GPS_AUTOCENTRE_FAILED_EVENT,
} from '@/lib/gpsGrant';

// Cluster bubbles: token-styled in map.css, sized by count
const createClusterIcon = (cluster: { getChildCount: () => number }) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 'small' : count < 100 ? 'medium' : 'large';
  const px = count < 10 ? 36 : count < 100 ? 40 : 46;
  return L.divIcon({
    html: `<span>${count}</span>`,
    className: `am-cluster am-cluster-${size}`,
    iconSize: L.point(px, px),
  });
};

interface LeafletMapProps {
  places?: Place[]; 
  selectedPlaceId?: string | null; 
  onMarkerClick?: (placeId: string) => void; 
  detailCardRef?: React.RefObject<HTMLDivElement>; 
  isLoading?: boolean; 
  suppressOverlay?: boolean;
  /** Card strip mode: a pin tap goes here instead of opening the drawer */
  onPinTap?: ((id: string, info: { bounds: L.LatLngBounds; fromKeyboard: boolean }) => void) | undefined;
  /** Business the card strip is showing; its pin is highlighted */
  stripSelectedId?: string | null | undefined;
  /** Bumped on every strip selection so its pin is re-checked for visibility */
  stripSelectionSeq?: number | undefined;
  /** Drawer opened from a strip card: opens without moving the map */
  cardDrawerId?: string | null | undefined;
  onCardDrawerClose?: (() => void) | undefined;
  onEmptyMapClick?: (() => void) | undefined;
  onUserMoveEnd?: ((bounds: L.LatLngBounds) => void) | undefined;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ 
  places = [], 
  selectedPlaceId = null,
  onMarkerClick,
  detailCardRef,
  isLoading = false,
  suppressOverlay = false,
  onPinTap,
  stripSelectedId = null,
  stripSelectionSeq = 0,
  cardDrawerId = null,
  onCardDrawerClose,
  onEmptyMapClick,
  onUserMoveEnd,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const cardDrawerIdRef = useRef(cardDrawerId);
  cardDrawerIdRef.current = cardDrawerId;
  // Read by CountryClickFocus at click time: a tap on empty map while the strip
  // is open only closes the strip (no country fly)
  const stripOpenRef = useRef(false);
  stripOpenRef.current = !!stripSelectedId;
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [mapCenter, setMapCenter] = useState<LatLngTuple>([defaultCenter.lat, defaultCenter.lng]); // San Francisco by default
  const [zoom, setZoom] = useState(defaultZoom);
  // Drops the OSM attribution pill to just above the on-screen keyboard (map.css)
  const keyboardOpen = useKeyboardOpen();

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

  // Auto-center on user's geolocation once per session, only when "Use my
  // location" is on and GPS is already allowed (canAutoCentreWithGps) — never
  // prompts. On failure, useIpLocationFocus falls back to the IP location.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    try {
      if (sessionStorage.getItem('gps_autocentered') === '1') return;
    } catch {
      // storage unavailable
    }
    let cancelled = false;
    (async () => {
      const allowed = await canAutoCentreWithGps();
      if (cancelled) return;
      try {
        sessionStorage.setItem('gps_autocentered', '1');
      } catch {
        // ignore
      }
      if (!allowed) return;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          markGranted();
          if (cancelled) return;
          window.dispatchEvent(
            new CustomEvent('centerMap', {
              detail: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                zoom: 14,
              },
            })
          );
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) clearGranted();
          try {
            sessionStorage.setItem(GPS_AUTOCENTRE_FAILED_KEY, '1');
          } catch {
            // ignore
          }
          window.dispatchEvent(new Event(GPS_AUTOCENTRE_FAILED_EVENT));
        },
        { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
      );
    })();
    return () => {
      cancelled = true;
    };
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
    } else if (!cardDrawerIdRef.current) {
      // Don't reset map center when closing overlay - keep user's current view.
      // A drawer opened from a strip card isn't driven by selectedPlaceId: leave it open.
      setActiveMarker(null);
      setShowPopover(false);
    }
  }, [selectedPlaceId, displayPlaces]);

  // Drawer opened from a strip card: show it without recentring, so the strip's
  // list and the map stay as they were when it closes
  useEffect(() => {
    if (!cardDrawerId) return;
    setActiveMarker(cardDrawerId);
    setShowPopover(true);
  }, [cardDrawerId]);

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

  const handleMarkerClick = useCallback((id: string, fromKeyboard = false) => {
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
    // Card strip mode: select in the strip, don't open the drawer
    if (onPinTap && mapRef.current) {
      onPinTap(id, { bounds: mapRef.current.getBounds(), fromKeyboard });
      return;
    }
    setActiveMarker(id);
    setShowPopover(true);

    if (onMarkerClick) {
      onMarkerClick(id);
    }
  }, [onMarkerClick, suppressOverlay, onPinTap]);

  const handleOverlayClick = () => {
    setActiveMarker(null);
    setShowPopover(false);
    // Back to the strip, same card selected
    if (cardDrawerId && onCardDrawerClose) onCardDrawerClose();
    
    if (onMarkerClick) {
      onMarkerClick("");
    }
  };

  const selectedPlace = activeMarker ? (displayPlaces.find(place => place.id === activeMarker) ?? null) : null;

  return (
    <div className={`w-full h-full relative${keyboardOpen ? ' keyboard-open' : ''}${stripSelectedId ? ' strip-open' : ''}`}>
      
      <MapContainer 
        ref={mapRef}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        className="leaflet-container"
        center={mapCenter}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        maxBounds={worldBounds}
        maxBoundsViscosity={maxBoundsViscosity}
        attributionControl={false}
      >
        <TileLayer 
          url={OSM_TILE_LAYER.url}
          attribution={OSM_TILE_LAYER.attribution}
        />
        <AttributionControl position="bottomleft" prefix={false} />
        
        <MapViewUpdater center={mapCenter} zoom={zoom} />
        <CountryClickFocus skipRef={stripOpenRef} />
        <CountryZoomControl anchorKey={stripSelectedId ? 'strip' : 'fab'} />
        <StripMapSync
          places={displayPlaces}
          selectedId={stripSelectedId}
          selectionSeq={stripSelectionSeq}
          onEmptyMapClick={onEmptyMapClick}
          onUserMoveEnd={onUserMoveEnd}
        />
        
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
          iconCreateFunction={createClusterIcon}
        >
          <MapMarkers
            places={displayPlaces}
            activeMarkerId={activeMarker ?? stripSelectedId}
            onMarkerClick={handleMarkerClick}
            showPopups={!onPinTap}
          />
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