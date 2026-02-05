import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Clock, Phone, Mail, Globe, Tag } from 'lucide-react';
import { Place } from '@/types/business';

interface DetailsCardProps {
  place: Place;
}

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const formatDayName = (day: string): string => {
  return day.charAt(0).toUpperCase() + day.slice(1);
};

const DetailsCard: React.FC<DetailsCardProps> = ({ place }) => {
  // Get categories from the category string (comma-separated)
  const categories = place.category
    ? place.category.split(',').map(cat => cat.trim()).filter(Boolean)
    : [];

  // Format hours for display
  const getFormattedHours = () => {
    if (!place.hours) return null;
    
    return DAYS_ORDER.map(day => {
      const hours = place.hours?.[day];
      return {
        day: formatDayName(day),
        hours: hours || 'Not specified'
      };
    });
  };

  const formattedHours = getFormattedHours();

  return (
    <Card className="w-full max-w-lg bg-white shadow-md rounded-xl overflow-hidden border border-gray-100">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <h2 className="text-lg font-semibold text-gray-800">{place.name}</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-0">
          {/* Left Column - Trading Hours & Website */}
          <div className="space-y-4">
            {/* Trading Hours */}
            <div className="mr-[-10px]">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-avante-blue flex-shrink-0" />
                <h3 className="text-sm font-medium text-gray-700">Trading Hours</h3>
              </div>
              <div className="text-xs space-y-1 text-gray-600">
                {formattedHours ? (
                  formattedHours.map(({ day, hours }) => (
                    <p key={day}>
                      <span className="font-medium">{day}:</span> {hours}
                    </p>
                  ))
                ) : (
                  <p className="text-gray-400 italic">No hours specified</p>
                )}
              </div>
            </div>
            
            {/* Website */}
            {place.website && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Globe className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <h3 className="text-sm font-medium text-gray-700">Website</h3>
                </div>
                <a 
                  href={place.website}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-avante-blue flex items-center text-xs hover:underline"
                >
                  {place.website.replace(/(^\w+:|^)\/\//, '')}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}
          </div>

          {/* Right Column - Categories & Contact Details */}
          <div className="space-y-4">
            {/* Categories */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Tag className="h-5 w-5 text-avante-purple flex-shrink-0" />
                <h3 className="text-sm font-medium text-gray-700">Categories</h3>
              </div>
              <div className="text-xs space-y-1 text-gray-600">
                {categories.length > 0 ? (
                  categories.map((category, index) => (
                    <p key={index}>{category}</p>
                  ))
                ) : (
                  <p className="text-gray-400 italic">No categories specified</p>
                )}
              </div>
            </div>
            
            {/* Contact Details */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Phone className="h-5 w-5 text-avante-teal flex-shrink-0" />
                <h3 className="text-sm font-medium text-gray-700">Contact Details</h3>
              </div>
              <div className="text-xs space-y-1 text-gray-600">
                {place.phone ? (
                  <p>Phone: {place.phone}</p>
                ) : (
                  <p className="text-gray-400 italic">No phone number</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DetailsCard;
