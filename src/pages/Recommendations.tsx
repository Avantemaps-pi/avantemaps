import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PlaceCard from '@/components/business/PlaceCard';
import { useIsMobile } from '@/hooks/use-mobile';
import RecommendationsSEO from '@/components/seo/RecommendationsSEO';
import { useRecommendations } from '@/hooks/useRecommendations';
import RecommendationSkeleton from '@/components/recommendations/RecommendationSkeleton';
import EmptyRecommendationSection from '@/components/recommendations/EmptyRecommendationSection';
import { Award, Star } from 'lucide-react';
import MetaTags from '@/components/seo/MetaTags';

const Recommendations = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { avanteTopChoice, recommendedForYou, isLoading } = useRecommendations();

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
      
      <div className="w-full mx-auto mt-4 pb-6 overflow-y-auto overflow-x-hidden px-0">
        <div className="space-y-6 pb-1 px-0 overflow-x-hidden lg:ml-[15px]">
          {[
            {
              title: 'Avante Top Choice',
              data: avanteTopChoice,
              key: 'avanteTopChoice',
              icon: Award,
              emptyMessage: 'No verified and certified businesses yet. Check back soon!'
            },
            {
              title: 'Recommended for you',
              data: recommendedForYou,
              key: 'recommendedForYou',
              icon: Star,
              emptyMessage: 'No recommendations available yet.'
            }
          ].map(({ title, data, key, icon, emptyMessage }) => (
            <section
              key={key}
              onMouseEnter={() => handleMouseEnter(key)}
              onMouseLeave={handleMouseLeave}
              onTouchStart={() => handleMouseEnter(key)}
              className="relative w-full overflow-x-hidden"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center px-4 md:px-[15px]">
                <span className="bg-primary h-4 w-1 rounded-full mr-2"></span>
                {title}
              </h2>
              
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
