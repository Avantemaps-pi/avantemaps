import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Clock, Phone, Mail, Globe, Tag } from 'lucide-react';
import { Place } from '@/types/business';

interface DetailsCardProps {
  place: Place;
}

const DetailsCard: React.FC<DetailsCardProps> = ({ place }) => {
  return (
    <Card className="w-full max-w-md bg-white shadow-md rounded-xl overflow-hidden border border-gray-100">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <h2 className="text-lg font-semibold text-gray-800">{place.name}</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-5">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-avante-blue flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Trading Hours</h3>
                <div className="text-xs space-y-1 text-gray-600">
                  <p><span className="font-medium">Sunday:</span> Closed</p>
                  <p><span className="font-medium">Monday - Friday:</span> 9 AM - 6 PM</p>
                  <p><span className="font-medium">Saturday:</span> 10 AM - 4 PM</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Tag className="h-5 w-5 text-avante-purple flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Categories</h3>
                <div className="text-xs space-y-1 text-gray-600">
                  <p>{place.category}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Phone className="h-5 w-5 text-avante-teal flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Contact Details</h3>
                <div className="text-xs space-y-1 text-gray-600">
                  <p>Phone: (123) 456-7890</p>
                  <p>Email: info@business.com</p>
                </div>
              </div>
            </div>
            
            {place.website && (
              <div className="flex items-start space-x-3">
                <Globe className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Website</h3>
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
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DetailsCard;
