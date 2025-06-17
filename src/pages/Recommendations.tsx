
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { recommendedForYou, suggestedForYou, avanteTopChoice } from '@/data/mockPlaces';
import PlaceCard from '@/components/business/PlaceCard';
import { useIsMobile } from '@/hooks/use-mobile';

const Recommendations = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handlePlaceClick = (placeId: string) => {
    navigate('/', {
      state: {
        selectedPlaceId: placeId
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
      <div className="w-full mx-auto mt-4 pb-6 overflow-y-auto overflow-x-hidden px-0">
        <div className="space-y-6 pb-1 px-0 overflow-x-hidden">
          {[
            {
              title: 'Avante Top Choice',
              data: avanteTopChoice,
              key: 'avanteTopChoice'
            },
            {
              title: 'Suggested for you',
              data: suggestedForYou,
              key: 'suggestedForYou'
            },
            {
              title: 'Recommended for you',
              data: recommendedForYou,
              key: 'recommendedForYou'
            }
          ].map(({ title, data, key }) => (
            <section 
              key={key}
              onMouseEnter={() => handleMouseEnter(key)}
              onMouseLeave={handleMouseLeave}
              onTouchStart={() => handleMouseEnter(key)}
              className="relative w-full overflow-x-hidden"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center md:px-0 px-4">
                <span className="bg-primary h-4 w-1 rounded-full mr-2"></span>
                {title}
              </h2>
              
              {/* Horizontal Scroll Snap Slider for Place Cards Only */}
              <div className="relative overflow-x-hidden">
                <div 
                  className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide"
                  style={{ paddingLeft: isMobile ? '1rem' : '0', paddingRight: isMobile ? '1rem' : '0' }}
                >
                  {data.map((place) => (
                    <div 
                      key={place.id}
                      className="flex-none w-80 snap-start"
                    >
                      <PlaceCard 
                        place={place} 
                        onPlaceClick={handlePlaceClick} 
                        className="w-full h-full"
                      />
                    </div>
                  ))}
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
