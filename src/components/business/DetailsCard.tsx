import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Clock, Phone, Mail, Globe, Tag } from 'lucide-react';
import { Place } from '@/types/business';

interface DetailsCardProps {
  place: Place;
  className?: string;
}

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const formatDayName = (day: string): string => {
  return day.charAt(0).toUpperCase() + day.slice(1, 3);
};

const DetailsCard: React.FC<DetailsCardProps> = ({ place }) => {
  const categories = place.category
    ? place.category.split(',').map(cat => cat.trim()).filter(Boolean)
    : [];

  const getFormattedHours = () => {
    if (!place.hours) return null;
    
    return DAYS_ORDER.map(day => {
      const hours = place.hours?.[day];
      return {
        day: formatDayName(day),
        hours: hours || 'N/A'
      };
    });
  };

  const formattedHours = getFormattedHours();

  return (
    <Card className="w-full max-w-lg bg-white shadow-md rounded-xl overflow-hidden border border-gray-100">
      <CardContent className="p-4">
        
        <div className="grid grid-cols-2 gap-1 overflow-hidden">
          {/* Left Column - Trading Hours */}
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 mb-1.5">
              <Clock className="h-4 w-4 text-avante-blue flex-shrink-0" />
              <h3 className="text-xs font-medium text-gray-700">Trading Hours</h3>
            </div>
            <div className="text-[11px] space-y-0.5 text-gray-600">
              {formattedHours ? (
                formattedHours.map(({ day, hours }) => (
                  <p key={day} className="truncate">
                    <span className="font-medium">{day}:</span> {hours}
                  </p>
                ))
              ) : (
                <p className="text-gray-400 italic">No hours</p>
              )}
            </div>
          </div>

          {/* Right Column - Categories & Contact & Website */}
          <div className="space-y-1.5 min-w-0 overflow-hidden">
            {/* Categories */}
            <div>
              <div className="flex items-center space-x-1.5 mb-1.5">
                <Tag className="h-4 w-4 text-avante-purple flex-shrink-0" />
                <h3 className="text-xs font-medium text-gray-700">Categories</h3>
              </div>
              <div className="text-[11px] space-y-0.5 text-gray-600">
                {categories.length > 0 ? (
                  categories.map((category, index) => (
                    <p key={index} className="truncate">{category}</p>
                  ))
                ) : (
                  <p className="text-gray-400 italic">None</p>
                )}
              </div>
            </div>
            
            {/* Contact Details */}
            <div>
              <div className="flex items-center space-x-1.5 mb-1.5">
                <Phone className="h-4 w-4 text-avante-teal flex-shrink-0" />
                <h3 className="text-xs font-medium text-gray-700">Contact</h3>
              </div>
              <div className="text-[11px] space-y-0.5 text-gray-600 overflow-hidden">
                {place.phone ? (
                  <p className="truncate">{place.phone}</p>
                ) : (
                  <p className="text-gray-400 italic">No phone</p>
                )}
                {place.email && (
                  <p className="truncate">{place.email}</p>
                )}
              </div>
            </div>

            {/* Website */}
            {place.website && (
              <div>
                <div className="flex items-center space-x-1.5 mb-1.5">
                  <Globe className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <h3 className="text-xs font-medium text-gray-700">Website</h3>
                </div>
                <a 
                  href={place.website}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-avante-blue flex items-center text-[11px] hover:underline truncate"
                >
                  <span className="truncate">{place.website.replace(/(^\w+:|^)\/\//, '')}</span>
                  <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                </a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DetailsCard;
