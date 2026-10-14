import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import AppLayout from '@/components/layout/AppLayout';
import PlaceCard from '@/components/business/PlaceCard';
import RecommendationsSEO from '@/components/seo/RecommendationsSEO';
import { useRecommendations } from '@/hooks/useRecommendations';
import BusinessCardSkeleton from '@/components/business/BusinessCardSkeleton';
import { ChevronDown, Check, Lock, ArrowRight, ArrowLeft, AlertCircle, SearchX, Store } from 'lucide-react';
import MetaTags from '@/components/seo/MetaTags';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { StateBlock } from '@/components/ui/state-block';
import { useBusinessData } from '@/hooks/useBusinessData';
import { useAuth } from '@/context/auth';
import LoginDialog from '@/components/auth/LoginDialog';
import { getOrigin } from '@/utils/browserEnv';

const Recommendations = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleExpanded = (key: string) => {
    setExpandedSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // Scroll the section into view when expanding so users see the vertical list
      if (next[key]) {
        requestAnimationFrame(() => {
          const el = document.getElementById(`section-${key}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      return next;
    });
  };

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'rating'>('rating');
  const { avanteTopChoice, recommendedForYou, isLoading, isError, refetch } = useRecommendations();
  const [retrying, setRetrying] = useState(false);
  const { places } = useBusinessData();
  const recommendedForYouRef = useRef<HTMLElement>(null);

  // Derive categories dynamically from actual business data
  const categories = useMemo(() => {
    if (!places || places.length === 0) return [];
    const categorySet = new Set<string>();
    places.forEach(place => {
      if (place.category) categorySet.add(place.category);
    });
    return Array.from(categorySet).sort();
  }, [places]);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    const filterBusinesses = (businesses: any[]) => {
      return businesses.filter(business => {
        const matchesCategory = selectedCategories.length === 0 ||
          selectedCategories.some(cat =>
            business.category?.toLowerCase().includes(cat.toLowerCase()) ||
            business.business_types?.some((type: string) =>
              type.toLowerCase().includes(cat.toLowerCase())
            )
          );

        return matchesCategory;
      });
    };

    const sortBusinesses = (businesses: any[]) => {
      return [...businesses].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    };

    return {
      avanteTopChoice: filterBusinesses(avanteTopChoice || []),
      recommendedForYou: sortBusinesses(filterBusinesses(recommendedForYou || []))
    };
  }, [avanteTopChoice, recommendedForYou, selectedCategories, sortBy]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handlePlaceClick = (placeId: string, zoomToLocation?: boolean) => {
    navigate('/', {
      state: {
        selectedPlaceId: placeId,
        zoomToLocation: zoomToLocation
      }
    });
  };

  // One page state, and exactly one UI for it
  const bothEmpty = filteredData.avanteTopChoice.length === 0 && filteredData.recommendedForYou.length === 0;
  // A refetch with no data goes back to loading, so keep the error up while Try again runs
  const pageState: 'loading' | 'error' | 'none' | 'no-match' | 'ok' = retrying && bothEmpty
    ? 'error'
    : isLoading
      ? 'loading'
      : isError && bothEmpty
        ? 'error'
        : bothEmpty
          ? (selectedCategories.length > 0 ? 'no-match' : 'none')
          : 'ok';

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await refetch();
    } finally {
      setRetrying(false);
    }
  };

  const handleMouseEnter = (section: string) => {
    setActiveSection(section);
  };

  const handleMouseLeave = () => {
    setActiveSection(null);
  };

  return (
    <AppLayout title="Recommendations" className="overflow-x-hidden">
      <RecommendationsSEO />
      <MetaTags
        title="Discover Recommended Businesses"
        description="Browse curated recommendations for top local businesses. Find the best restaurants, shops, and services in your area."
        keywords={['business recommendations', 'top businesses', 'local favorites', 'pi network businesses', 'recommended places']}
        ogType="website"
        ogTitle="Business Recommendations on Avante Maps"
        ogDescription="Discover top-rated local businesses recommended by the community"
        ogImage={{
          url: `${getOrigin()}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'Avante Maps Recommendations'
        }}
        twitter={{
          card: 'summary_large_image',
          title: 'Business Recommendations - Avante Maps',
          description: 'Discover top-rated local businesses'
        }}
      />

      {!authLoading && !isAuthenticated ? (
        <div className="w-full mx-auto pb-6 px-4 md:px-[15px] flex items-center justify-center min-h-[60vh]">
          <StateBlock
            kind="empty"
            icon={Lock}
            title="Sign in to see recommendations"
            body="Recommendations are for signed-in Pi Network users."
            action={{ label: 'Sign in with Pi', onClick: () => setShowLogin(true) }}
          />
          <LoginDialog open={showLogin} onOpenChange={setShowLogin} />
        </div>
      ) : (
      <div className="w-full mx-auto pb-6 overflow-y-auto overflow-x-hidden px-0">
        {/* Active Filters Summary */}
        {selectedCategories.length > 0 && (
          <div className="px-4 md:px-[15px] mb-2 lg:ml-[15px]">
            <div className="text-sm text-muted-foreground flex flex-wrap gap-1 items-center">
              <span>Categories:</span>
              {selectedCategories.map(cat => (
                <Badge key={cat} variant="secondary" className="text-xs">
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {pageState === 'loading' && (
          <div role="status" className="sr-only">Loading businesses…</div>
        )}

        {(pageState === 'error' || pageState === 'none' || pageState === 'no-match') && (
          <div className="flex items-center justify-center min-h-[50vh] px-4">
            {pageState === 'error' && (
              <StateBlock
                kind="error"
                icon={AlertCircle}
                title="Couldn't load recommendations"
                body="Check your connection, then try again."
                action={{ label: 'Try again', onClick: handleRetry, loading: retrying }}
              />
            )}
            {pageState === 'none' && (
              <StateBlock
                kind="empty"
                icon={Store}
                title="No recommendations yet"
                body="Check back as more businesses join Avante Maps."
                action={{ label: 'Explore the map', onClick: () => navigate('/') }}
              />
            )}
            {pageState === 'no-match' && (
              <StateBlock
                kind="empty"
                icon={SearchX}
                title="No businesses in these categories"
                body="Try other categories, or clear them to see everything."
                action={{ label: 'Clear categories', onClick: () => setSelectedCategories([]) }}
              />
            )}
          </div>
        )}

        <div className="space-y-6 pb-1 px-0 overflow-x-hidden lg:ml-[15px]">
          {[
            {
              title: 'Avante Top Choice',
              data: filteredData.avanteTopChoice,
              key: 'avanteTopChoice',
            },
            {
              title: 'Recommended for you',
              data: filteredData.recommendedForYou,
              key: 'recommendedForYou',
            }
          ].filter(({ data }) => pageState === 'loading' || (pageState === 'ok' && data.length > 0)).map(({ title, data, key }) => {
            const isExpanded = !!expandedSections[key];
            return (
            <section
              key={key}
              id={`section-${key}`}
              ref={key === 'recommendedForYou' ? recommendedForYouRef : undefined}
              onMouseEnter={() => handleMouseEnter(key)}
              onMouseLeave={handleMouseLeave}
              onTouchStart={() => handleMouseEnter(key)}
              className="relative w-full overflow-x-hidden scroll-mt-20"
            >
              {/* Wraps so the Categories button drops below the title when there isn't room */}
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 mb-4 px-4 md:px-[15px]">
                <h2 className="text-xl leading-7 font-semibold text-foreground flex items-center flex-1">
                  <span className="bg-primary h-4 w-1 rounded-full mr-2 flex-shrink-0"></span>
                  <span className="whitespace-nowrap">{title}</span>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(key)}
                    aria-label={isExpanded ? `Collapse ${title}` : `View all ${title}`}
                    aria-expanded={isExpanded}
                    className="ml-0.5 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-primary hover:bg-accent transition-colors"
                  >
                    {isExpanded ? (
                      <ArrowLeft className="h-5 w-5" />
                    ) : (
                      <ArrowRight className="h-5 w-5" />
                    )}
                  </button>
                </h2>
                {key === 'avanteTopChoice' && categories.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-11 sm:h-11 px-4 text-sm font-semibold">
                        Categories
                        {selectedCategories.length > 0 && (
                          <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                            {selectedCategories.length}
                          </Badge>
                        )}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-background z-50" align="end">
                      {categories.map(category => (
                        <DropdownMenuItem
                          key={category}
                          onClick={() => toggleCategory(category)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center w-full justify-between">
                            <span>{category}</span>
                            {selectedCategories.includes(category) && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {isExpanded ? (
                /* Vertical grid showing all matches, scrollable up/down with the page */
                <div className="px-4 md:px-[15px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pageState === 'loading' ? (
                      <>
                        <BusinessCardSkeleton className="w-full" />
                        <BusinessCardSkeleton className="w-full" />
                        <BusinessCardSkeleton className="w-full" />
                      </>
                    ) : (
                      data.map(place => (
                        <PlaceCard
                          key={place.id}
                          place={place}
                          onPlaceClick={handlePlaceClick}
                          className="w-full h-full"
                        />
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* Horizontal scroll-snap row; 300px cards so the next one peeks at 375px */
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 pb-2 scrollbar-hide px-4 md:px-[15px]">
                  {pageState === 'loading' ? (
                    <>
                      <BusinessCardSkeleton className="w-[300px] flex-none" />
                      <BusinessCardSkeleton className="w-[300px] flex-none" />
                      <BusinessCardSkeleton className="w-[300px] flex-none" />
                    </>
                  ) : (
                    data.map(place => (
                      <PlaceCard
                        key={place.id}
                        place={place}
                        onPlaceClick={handlePlaceClick}
                        className="w-[300px] flex-none snap-start h-full"
                      />
                    ))
                  )}
                </div>
              )}
            </section>
            );
          })}
        </div>
      </div>
      )}
    </AppLayout>
  );
};

export default Recommendations;
