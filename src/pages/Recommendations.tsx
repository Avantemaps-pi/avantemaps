import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PlaceCard from '@/components/business/PlaceCard';
import { useIsMobile } from '@/hooks/use-mobile';
import RecommendationsSEO from '@/components/seo/RecommendationsSEO';
import { useRecommendations } from '@/hooks/useRecommendations';
import RecommendationSkeleton from '@/components/recommendations/RecommendationSkeleton';
import EmptyRecommendationSection from '@/components/recommendations/EmptyRecommendationSection';
import { Award, Star, ChevronDown, Check, Lock, ArrowRight, ArrowLeft, Inbox } from 'lucide-react';
import MetaTags from '@/components/seo/MetaTags';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useBusinessData } from '@/hooks/useBusinessData';
import { useAuth } from '@/context/auth';
import LoginDialog from '@/components/auth/LoginDialog';

const Recommendations = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
  const { avanteTopChoice, recommendedForYou, isLoading } = useRecommendations();
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
          url: `${window.location.origin}/og-image.png`,
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
          <div className="max-w-md w-full text-center bg-card border rounded-xl p-6 shadow-xs">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sign in to view Pi recommendations</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Pi-accepting business recommendations are available to authenticated Pi Network users. Sign in to discover top-rated Pi-accepting businesses curated for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => setShowLogin(true)} className="w-full sm:w-auto">
                Login with Pi Network
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full sm:w-auto">
                Back to map
              </Button>
            </div>
          </div>
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

        {/* Combined empty state when both sections have no data */}
        {!isLoading && filteredData.avanteTopChoice.length === 0 && filteredData.recommendedForYou.length === 0 && (
          <div className="flex items-center justify-center min-h-[50vh] px-4">
            <div className="text-center max-w-sm">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No recommendations yet</h3>
              <p className="text-sm text-muted-foreground">
                Check back as more businesses join Avante Maps.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6 pb-1 px-0 overflow-x-hidden lg:ml-[15px]">
          {[
            {
              title: 'Avante Top Choice',
              data: filteredData.avanteTopChoice,
              key: 'avanteTopChoice',
              icon: Award,
              emptyMessage: selectedCategories.length > 0
                ? 'No businesses match your selected categories.'
                : 'No verified and certified businesses yet. Check back soon!'
            },
            {
              title: 'Recommended for you',
              data: filteredData.recommendedForYou,
              key: 'recommendedForYou',
              icon: Star,
              emptyMessage: selectedCategories.length > 0
                ? 'No businesses match your selected categories.'
                : 'No recommendations available yet.'
            }
          ].filter(({ data }) => isLoading || data.length > 0).map(({ title, data, key, icon, emptyMessage }) => {
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
              <div className="flex items-center justify-between mb-4 px-4 md:px-[15px]">
                <h2 className="text-xl font-semibold flex items-start min-w-0 flex-1 mr-2">
                  <span className="bg-primary h-4 w-1 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                  <span className="min-w-0 whitespace-nowrap">
                    {title}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(key)}
                      aria-label={isExpanded ? `Collapse ${title}` : `View all ${title}`}
                      aria-expanded={isExpanded}
                      className="ml-1.5 inline-flex items-center justify-center h-6 w-6 rounded-full text-primary hover:bg-primary/10 transition-colors align-middle"
                    >
                      {isExpanded ? (
                        <ArrowLeft className="h-4 w-4" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </button>
                  </span>
                </h2>
                {key === 'avanteTopChoice' && categories.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-background text-sm">
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
                  {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <RecommendationSkeleton />
                      <RecommendationSkeleton />
                      <RecommendationSkeleton />
                    </div>
                  ) : data.length === 0 ? (
                    <EmptyRecommendationSection
                      title={title}
                      message={emptyMessage}
                      icon={icon}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {data.map(place => (
                        <div key={place.id} className="w-full">
                          <PlaceCard
                            place={place}
                            onPlaceClick={handlePlaceClick}
                            className="w-full h-full"
                            showDetails={true}
                            hideGalleryIndicators
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Horizontal Scroll Snap Slider for Place Cards Only */
                <div className="relative overflow-x-hidden">
                  <div
                    style={{
                      paddingLeft: isMobile ? '1rem' : '0',
                      paddingRight: isMobile ? '1rem' : '0'
                    }}
                    className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide px-0 mx-[15px]"
                  >
                    {isLoading ? (
                      <>
                        <RecommendationSkeleton />
                        <RecommendationSkeleton />
                        <RecommendationSkeleton />
                      </>
                    ) : data.length === 0 ? (
                      <EmptyRecommendationSection
                        title={title}
                        message={emptyMessage}
                        icon={icon}
                      />
                    ) : (
                      data.map(place => (
                        <div key={place.id} className="flex-none w-80 snap-start">
                          <PlaceCard
                            place={place}
                            onPlaceClick={handlePlaceClick}
                            className="w-full h-full"
                            showDetails={true}
                            hideGalleryIndicators
                          />
                        </div>
                      ))
                    )}
                  </div>
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
