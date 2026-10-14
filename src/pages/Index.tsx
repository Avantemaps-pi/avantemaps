
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from '@/lib/router-compat';
import { useBusinessData } from '@/hooks/useBusinessData';
import { AlertCircle, Loader2, Menu, SearchX, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StateBlock, type StateBlockProps } from '@/components/ui/state-block';
import SearchBar from '@/components/map/SearchBar';
import CategoryFilter, { CATEGORY_OPTIONS } from '@/components/map/CategoryFilter';
import LocateMeButton from '@/components/map/buttons/LocateMeButton';
import LocationBanner from '@/components/map/LocationBanner';
import { useSidebar } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/AppSidebar';
import BottomNavBar from '@/components/layout/BottomNavBar';
import PlaceCardSEO from '@/components/seo/PlaceCardSEO';
import MetaTags from '@/components/seo/MetaTags';
import { BusinessSuggestion } from '@/hooks/useBusinessAutocomplete';
import { useSearchTracking } from '@/hooks/useSearchTracking';
import { useAuth } from '@/context/auth/useAuth';
import LandingPage from './LandingPage';
import { useIpLocationFocus } from '@/hooks/useIpLocationFocus';
import '../styles/map.css';
import { getOrigin } from '@/utils/browserEnv';

const LeafletMap = lazy(() => import('@/components/map/LeafletMap'));
const AddBusinessButton = lazy(() => import('@/components/map/buttons/AddBusinessButton'));

const Index = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const { places = [], filteredPlaces = [], isLoading = false, isError, refetch, handleSearch } = useBusinessData();
  const [retrying, setRetrying] = useState(false);
  // Bumped to remount SearchBar, which clears its input (it keeps its own value)
  const [searchResetKey, setSearchResetKey] = useState(0);
  const { setOpenMobile } = useSidebar();
  const { trackBusinessSearch } = useSearchTracking();

  // After login, focus the map on the user's approximate IP location (cached, once per session)
  useIpLocationFocus(isAuthenticated && !authLoading);

  const handlePlaceClick = (placeId: string, zoomToLocation?: boolean) => {
    setSelectedPlace(placeId);
    if (zoomToLocation) {
      // Trigger zoom event
      window.dispatchEvent(new CustomEvent('zoomToPlace', { detail: { placeId, zoom: true } }));
    }
  };
  
  const handleMenuClick = () => {
    setOpenMobile(true);
  };

  const handlePlaceSelect = (place: { name: string; lat: number; lng: number }) => {
    // Center the map on the selected place
    window.dispatchEvent(new CustomEvent('centerMap', { 
      detail: { lat: place.lat, lng: place.lng, zoom: 15 } 
    }));
  };

  const handleBusinessSelect = (business: BusinessSuggestion) => {
    // Track the business search for personalized recommendations
    trackBusinessSearch(Number(business.id), business.name);
    
    // Set selected place and zoom to it
    setSelectedPlace(business.id);
    window.dispatchEvent(new CustomEvent('centerMap', { 
      detail: { lat: business.lat, lng: business.lng, zoom: 16 } 
    }));
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    handleSearch(term);
  };

  // When the search results update, sync the map viewport to the best match
  // (the first item in filteredPlaces — useBusinessData orders by relevance).
  const lastCenteredKeyRef = React.useRef<string>('');
  useEffect(() => {
    if (!searchTerm.trim()) {
      lastCenteredKeyRef.current = '';
      return;
    }
    const best = filteredPlaces[0];
    if (!best) return;
    const lat = best.position?.lat ?? best.location?.lat;
    const lng = best.position?.lng ?? best.location?.lng;
    if (lat == null || lng == null) return;

    const key = `${searchTerm}::${best.id}`;
    if (lastCenteredKeyRef.current === key) return;
    lastCenteredKeyRef.current = key;

    setSelectedPlace(best.id);
    window.dispatchEvent(new CustomEvent('centerMap', {
      detail: { lat, lng, zoom: 14 },
    }));
  }, [searchTerm, filteredPlaces]);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Handle shared place URLs
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedPlaceId = urlParams.get('place');
    const state = location.state as { selectedPlaceId?: string; zoomToLocation?: boolean } | null;
    const stateSelectedPlaceId = state?.selectedPlaceId;
    const shouldZoom = state?.zoomToLocation;
    
    if (sharedPlaceId) {
      setSelectedPlace(sharedPlaceId);
    } else if (stateSelectedPlaceId) {
      setSelectedPlace(stateSelectedPlaceId);
      if (shouldZoom) {
        // Trigger zoom event with a slight delay to ensure map is ready
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('zoomToPlace', { detail: { placeId: stateSelectedPlaceId, zoom: true } }));
        }, 300);
      }
    }
  }, [location]);

  // Apply category filter on top of search filter
  const basePlaces = filteredPlaces.length > 0 || searchTerm ? filteredPlaces : places;
  const visiblePlaces = React.useMemo(() => {
    if (selectedCategoryId === 'all') return basePlaces;
    const opt = CATEGORY_OPTIONS.find(o => o.id === selectedCategoryId);
    if (!opt || opt.match.length === 0) return basePlaces;
    return basePlaces.filter(p => {
      const haystack = [
        p.category,
        ...(p.business_types || []),
        ...(p.keywords || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return opt.match.some(m => haystack.includes(m));
    });
  }, [basePlaces, selectedCategoryId]);

  // One state for the map screen, and exactly one message for it
  const hasSearch = searchTerm.trim() !== '';
  const hasCategory = selectedCategoryId !== 'all';
  // A refetch with no data puts the query back to pending (isLoading), so keep the
  // error card up while Try again runs, with the button showing its loading state.
  const mapState: 'loading' | 'error' | 'none' | 'no-match' | 'ok' = retrying && places.length === 0
    ? 'error'
    : isLoading
      ? 'loading'
      : isError && places.length === 0
        ? 'error'
      : places.length === 0 && !hasSearch && !hasCategory
        ? 'none'
        : visiblePlaces.length === 0 && (hasSearch || hasCategory)
          ? 'no-match'
          : 'ok';

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await refetch();
    } finally {
      setRetrying(false);
    }
  };

  const clearSearch = () => {
    handleSearchChange('');
    setSearchResetKey(k => k + 1);
  };

  const showAllCategories = () => setSelectedCategoryId('all');

  const getStateCard = (): StateBlockProps | null => {
    if (mapState === 'error') {
      return {
        kind: 'error',
        icon: AlertCircle,
        title: "Couldn't load businesses",
        body: 'Check your connection, then try again. The map itself still works.',
        action: { label: 'Try again', onClick: handleRetry, loading: retrying },
      };
    }
    if (mapState === 'none') {
      return {
        kind: 'empty',
        icon: Store,
        title: 'No businesses on the map yet',
        body: "Register yours and it'll be the first one people find here.",
        action: { label: 'Register business', onClick: () => navigate('/registration') },
      };
    }
    if (mapState === 'no-match') {
      const category = CATEGORY_OPTIONS.find(o => o.id === selectedCategoryId);
      if (!hasSearch) {
        return {
          kind: 'empty',
          icon: category?.icon ?? SearchX,
          title: `No ${(category?.label ?? 'matching').toLowerCase()} businesses yet`,
          body: 'Try another category, or check back soon.',
          action: { label: 'Show all categories', onClick: showAllCategories },
        };
      }
      const matchesInOtherCategories = hasCategory && filteredPlaces.length > 0;
      return {
        kind: 'empty',
        icon: SearchX,
        title: `No results for "${searchTerm.trim()}"`,
        body: matchesInOtherCategories
          ? 'There are matches in other categories.'
          : 'Check the spelling or try another name.',
        action: matchesInOtherCategories
          ? { label: 'Show all categories', onClick: showAllCategories }
          : { label: 'Clear search', onClick: clearSearch },
      };
    }
    return null;
  };
  const stateCard = getStateCard();

  // Find the selected place for SEO
  const selectedPlaceData = [...places, ...filteredPlaces].find(place => place.id === selectedPlace);

  // Show landing page for unauthenticated users
  if (!isAuthenticated && !authLoading) {
    return <LandingPage />;
  }

  // Show loading only when not yet authenticated and still loading
  if (!isAuthenticated && authLoading) {
    return <div className="w-full h-screen bg-muted animate-pulse" />;
  }

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* SEO metadata */}
      {selectedPlaceData ? (
        <PlaceCardSEO place={selectedPlaceData} isActive={true} />
      ) : (
        <MetaTags
          title="Discover Local Businesses"
          description="Find and explore local businesses on Avante Maps. Register your business, get discovered by customers, and transact with Pi cryptocurrency."
          keywords={['pi network', 'local businesses', 'business directory', 'cryptocurrency', 'pi payment', 'avante maps', 'business map']}
          authors={[{ name: 'Avante Maps Team' }]}
          ogType="website"
          ogImage={{
            url: `${getOrigin()}/og-image.png`,
            secure_url: `${getOrigin()}/og-image.png`,
            type: 'image/png',
            width: 1200,
            height: 630,
            alt: 'Avante Maps - Local Business Discovery'
          }}
          twitter={{
            card: 'summary_large_image',
            site: '@AvanteMap',
            title: 'Avante Maps - Discover Local Businesses',
            description: 'Find local businesses and pay with Pi Network',
            image: `${getOrigin()}/og-image.png`,
            image_alt: 'Avante Maps Preview'
          }}
          structuredData={{
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            'name': 'Avante Maps',
            'description': 'Local business discovery platform powered by Pi Network',
            'url': getOrigin(),
            'applicationCategory': 'BusinessApplication',
            'operatingSystem': 'Web',
            'offers': {
              '@type': 'Offer',
              'category': 'Subscription'
            }
          }}
        />
      )}

      <AppSidebar />

      {/* Map container with consistent sizing across all screens */}
      <div className="absolute inset-0 w-full h-full">
        <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
          <LeafletMap
            places={visiblePlaces}
            selectedPlaceId={selectedPlace}
            onMarkerClick={handlePlaceClick}
            isLoading={isLoading}
          />
        </Suspense>
      </div>
      
      {/* Floating UI - responsive positioning with proper spacing for sidebar */}
      {/* pointer-events-none so the map stays draggable in the gaps; each row opts back in */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 md:pl-[280px] lg:pl-[280px] pt-3 sm:pt-4 flex flex-col gap-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMenuClick}
            aria-label="Open menu"
            className="h-11 w-11 sm:h-11 sm:w-11 rounded-full flex-shrink-0 bg-surface-float border border-border shadow-float text-foreground sm:hidden [&_svg]:size-5 sm:[&_svg]:size-5"
          >
            <Menu />
          </Button>
          <div className="flex-1 min-w-0">
            <SearchBar 
              key={searchResetKey}
              onSearch={handleSearchChange}
              onPlaceSelect={handlePlaceSelect}
              onBusinessSelect={handleBusinessSelect}
              enableAutocomplete={true}
              autocompleteMode="business"
              businesses={places}
            />
          </div>
        </div>
        {/* Chips bleed to the right edge; -ml-1/pl-1 leaves room for the focus ring */}
        <CategoryFilter
          selectedCategoryId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          className="-ml-1 pl-1 -mr-4 pr-4 -my-1 pointer-events-auto"
        />
        {mapState === 'loading' && (
          <div className="flex justify-center">
            <div
              role="status"
              className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface-float px-4 shadow-float"
            >
              <Loader2 className="h-[18px] w-[18px] text-primary motion-safe:animate-spin" aria-hidden="true" />
              <span className="text-sm font-semibold text-foreground">Loading businesses…</span>
            </div>
          </div>
        )}
        <LocationBanner className="pointer-events-auto" />
      </div>

      {/* Error / empty / no-match card: below the top stack, only the card takes taps */}
      {stateCard && (
        <div className="absolute inset-x-0 top-[248px] z-10 flex justify-center px-4 md:pl-[280px] pointer-events-none">
          <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-border bg-card text-card-foreground shadow-float">
            <StateBlock {...stateCard} />
          </div>
        </div>
      )}
      
      <Suspense fallback={null}>
        <AddBusinessButton selectedPlace={selectedPlace} />
      </Suspense>
      {/* Top of the right-hand column: FAB (bottom 96px, 56px tall) + 12px gap + zoom group (90px) + 12px gap = 266px */}
      <LocateMeButton className="absolute right-4 bottom-[calc(266px+env(safe-area-inset-bottom))] z-20" />
      <BottomNavBar />
    </div>
  );
};

export default Index;
