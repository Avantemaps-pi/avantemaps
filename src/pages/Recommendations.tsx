import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PlaceCard from '@/components/business/PlaceCard';
import { useIsMobile } from '@/hooks/use-mobile';
import RecommendationsSEO from '@/components/seo/RecommendationsSEO';
import { useRecommendations } from '@/hooks/useRecommendations';
import RecommendationSkeleton from '@/components/recommendations/RecommendationSkeleton';
import EmptyRecommendationSection from '@/components/recommendations/EmptyRecommendationSection';
import { Award, Star, Search, X, ChevronDown, Check } from 'lucide-react';
import MetaTags from '@/components/seo/MetaTags';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const Recommendations = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'rating'>('rating');
  const { avanteTopChoice, recommendedForYou, isLoading } = useRecommendations();
  const recommendedForYouRef = useRef<HTMLElement>(null);

  // Common business categories
  const categories = [
    'Restaurant', 'Cafe', 'Retail', 'Technology', 'Health', 
    'Beauty', 'Entertainment', 'Services', 'Education', 'Finance'
  ];

  // Filtered and sorted data - memoized with proper dependencies
  const filteredData = useMemo(() => {
    const filterBusinesses = (businesses: any[]) => {
      return businesses.filter(business => {
        const matchesSearch = searchTerm === '' || 
          business.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          business.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = selectedCategories.length === 0 ||
          selectedCategories.some(cat => 
            business.category?.toLowerCase().includes(cat.toLowerCase()) ||
            business.business_types?.some((type: string) => 
              type.toLowerCase().includes(cat.toLowerCase())
            )
          );
        
        return matchesSearch && matchesCategory;
      });
    };

    const sortBusinesses = (businesses: any[]) => {
      return [...businesses].sort((a, b) => {
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'distance') return (a.distance || 0) - (b.distance || 0);
        return 0;
      });
    };

    return {
      avanteTopChoice: filterBusinesses(avanteTopChoice || []),
      recommendedForYou: sortBusinesses(filterBusinesses(recommendedForYou || []))
    };
  }, [avanteTopChoice, recommendedForYou, searchTerm, selectedCategories, sortBy]);

  // Handle sort change and scroll to Recommended for You section
  const handleSortChange = (newSort: 'rating' | 'distance') => {
    setSortBy(newSort);
    setTimeout(() => {
      recommendedForYouRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

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
      
      <div className="w-full mx-auto pb-6 overflow-y-auto overflow-x-hidden px-0">
        {/* Search and Filter Section */}
        <div className="px-4 md:px-[15px] mb-2 space-y-2 lg:ml-[15px] sticky top-0 z-[5] bg-background pb-1">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search businesses by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Active Filters Summary */}
          {(searchTerm || selectedCategories.length > 0) && (
            <div className="text-sm text-muted-foreground flex flex-wrap gap-2 items-center">
              {searchTerm && <span>Searching for: "{searchTerm}"</span>}
              {searchTerm && selectedCategories.length > 0 && <span>•</span>}
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  <span>Categories:</span>
                  {selectedCategories.map(cat => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6 pb-1 px-0 overflow-x-hidden lg:ml-[15px]">
          {[
            {
              title: 'Avante Top Choice',
              data: filteredData.avanteTopChoice,
              key: 'avanteTopChoice',
              icon: Award,
              emptyMessage: (searchTerm || selectedCategories.length > 0) 
                ? 'No businesses match your search criteria.'
                : 'No verified and certified businesses yet. Check back soon!'
            },
            {
              title: 'Recommended for you',
              data: filteredData.recommendedForYou,
              key: 'recommendedForYou',
              icon: Star,
              emptyMessage: (searchTerm || selectedCategories.length > 0)
                ? 'No businesses match your search criteria.'
                : 'No recommendations available yet.'
            }
          ].map(({ title, data, key, icon, emptyMessage }) => (
            <section
              key={key}
              ref={key === 'recommendedForYou' ? recommendedForYouRef : undefined}
              onMouseEnter={() => handleMouseEnter(key)}
              onMouseLeave={handleMouseLeave}
              onTouchStart={() => handleMouseEnter(key)}
              className="relative w-full overflow-x-hidden"
            >
              <div className="flex items-center justify-between mb-4 px-4 md:px-[15px]">
                <h2 className="text-xl font-semibold flex items-center">
                  <span className="bg-primary h-4 w-1 rounded-full mr-2"></span>
                  {title}
                </h2>
                {key === 'avanteTopChoice' && (
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
                {key === 'recommendedForYou' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-background text-sm">
                        {sortBy === 'rating' ? 'Rating' : 'Distance'}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-background z-50" align="end">
                      <DropdownMenuItem onClick={() => handleSortChange('rating')} className="cursor-pointer">
                        <div className="flex items-center w-full justify-between">
                          <span>Rating</span>
                          {sortBy === 'rating' && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange('distance')} className="cursor-pointer">
                        <div className="flex items-center w-full justify-between">
                          <span>Distance</span>
                          {sortBy === 'distance' && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {/* Horizontal Scroll Snap Slider for Place Cards Only */}
              <div className="relative overflow-x-hidden">
                <div
                  style={{
                    paddingLeft: isMobile ? '1rem' : '0',
                    paddingRight: isMobile ? '1rem' : '0'
                  }}
                  className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide px-0 mx-[15px]"
                >
                  {isLoading ? (
                    // Show loading skeletons
                    <>
                      <RecommendationSkeleton />
                      <RecommendationSkeleton />
                      <RecommendationSkeleton />
                    </>
                  ) : data.length === 0 ? (
                    // Show empty state
                    <EmptyRecommendationSection 
                      title={title}
                      message={emptyMessage}
                      icon={icon}
                    />
                  ) : (
                    // Show actual data
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
            </section>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Recommendations;
