
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { recommendedForYou, suggestedForYou, avanteTopChoice } from '@/data/mockPlaces';
import PlaceCard from '@/components/business/PlaceCard';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
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
    <AppLayout title="Recommendations">
      <div className="w-full mx-auto mt-4 pb-6 overflow-y-auto overflow-x-hidden px-0">
        <div className="space-y-8 pb-1 px-0">
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
              className="relative w-full max-w-[85%] mx-auto"
            >
              <h2 className="text-2xl font-semibold mb-4 flex items-center px-4">
                <span className="bg-primary h-5 w-1.5 rounded-full mr-3"></span>
                {title}
              </h2>
              
              <Carousel className="w-full overflow-x-hidden">
                {(activeSection === key || isMobile) && (
                  <>
                    <CarouselPrevious className="absolute left-2 z-10 bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-opacity duration-300 h-10 w-10" />
                    <CarouselNext className="absolute right-2 z-10 bg-white/90 backdrop-blur-sm shadow-lg border-0 transition-opacity duration-300 h-10 w-10" />
                  </>
                )}
                
                <CarouselContent className="ml-0 px-4">
                  {data.map(place => (
                    <CarouselItem key={place.id} className="basis-full sm:basis-1/2 lg:basis-1/3 pl-4">
                      <PlaceCard 
                        place={place} 
                        onPlaceClick={handlePlaceClick} 
                        className="w-full h-[400px]" 
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </section>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Recommendations;
