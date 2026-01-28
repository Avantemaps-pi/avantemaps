
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building, 
  Edit, 
  MapPin, 
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import BusinessVerificationStatus from './BusinessVerificationStatus';
import BusinessDropdownMenu from './BusinessDropdownMenu';
import { Business } from '@/types/business';

interface BusinessCardProps {
  business: Business;
  onEdit?: (id: number) => void;
  onDeleted?: () => void;
}

const BusinessCard = ({ business, onEdit, onDeleted }: BusinessCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = business.images || [];
  const hasImages = images.length > 0;

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Card key={business.id} className="overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted md:col-span-1 aspect-video md:aspect-auto flex items-center justify-center relative overflow-hidden">
          {hasImages ? (
            <>
              <img 
                src={images[currentImageIndex]} 
                alt={`${business.name} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {images.map((_, idx) => (
                      <span
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center p-4">
              <Building className="h-12 w-12 text-muted-foreground mx-auto" />
              <span className="block mt-2 text-sm text-muted-foreground">No Image</span>
            </div>
          )}
        </div>
        
        <div className="p-6 md:col-span-2">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">{business.name}</h2>
              <div className="flex items-center mt-1 text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-sm">{business.address}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => onEdit && onEdit(business.id)}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <BusinessDropdownMenu businessId={business.id} businessName={business.name} onDeleted={onDeleted} />
            </div>
          </div>
          
          <p className="mt-4 text-gray-700">{business.description}</p>
          
          <div className="mt-6 space-y-5">
            <BusinessVerificationStatus />
            
            <BusinessVerificationStatus isCertification={true} />
            
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-500" />
              <div>
                <span className="text-sm font-medium">Registration Date</span>
                <p className="text-sm text-muted-foreground">July 15, 2023</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default BusinessCard;
