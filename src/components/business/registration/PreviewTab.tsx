import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFormContext } from 'react-hook-form';
import { FormValues } from './formSchema';
import { Place } from '@/types/business';
import PlaceCard from '../PlaceCard';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageUploadStatus } from '@/hooks/useImageUpload';

interface PreviewTabProps {
  onNext: () => void;
  onPrevious: () => void;
  disabled?: boolean;
  images: ImageUploadStatus[];
}

const PreviewTab: React.FC<PreviewTabProps> = ({
  onNext,
  onPrevious,
  disabled,
  images
}) => {
  const { getValues } = useFormContext<FormValues>();
  const values = getValues();

  // Convert form values to Place object for preview
  const previewPlace: Place = {
    id: 'preview',
    name: values.businessName || 'Your Business Name',
    position: {
      lat: 0,
      lng: 0
    },
    address: values.streetAddress 
      ? `${values.streetAddress}${values.apartment ? `, ${values.apartment}` : ''}, ${values.city}, ${values.state} ${values.zipCode}`
      : 'Your business address',
    streetAddress: values.streetAddress,
    city: values.city,
    state: values.state,
    postalCode: values.zipCode,
    country: values.country,
    rating: 0,
    totalReviews: 0,
    category: values.businessTypes.join(', ') || 'Business',
    description: values.businessDescription || 'Your business description will appear here',
    image: images.length > 0 && images[0].previewUrl ? images[0].previewUrl : undefined,
    phone: values.phone ? `${values.countryCode || ''}${values.phone}` : undefined,
    website: values.website || undefined,
    hours: {
      monday: values.mondayClosed ? 'Closed' : `${values.mondayOpen} - ${values.mondayClose}`,
      tuesday: values.tuesdayClosed ? 'Closed' : `${values.tuesdayOpen} - ${values.tuesdayClose}`,
      wednesday: values.wednesdayClosed ? 'Closed' : `${values.wednesdayOpen} - ${values.wednesdayClose}`,
      thursday: values.thursdayClosed ? 'Closed' : `${values.thursdayOpen} - ${values.thursdayClose}`,
      friday: values.fridayClosed ? 'Closed' : `${values.fridayOpen} - ${values.fridayClose}`,
      saturday: values.saturdayClosed ? 'Closed' : `${values.saturdayOpen} - ${values.saturdayClose}`,
      sunday: values.sundayClosed ? 'Closed' : `${values.sundayOpen} - ${values.sundayClose}`,
    },
    isVerified: false,
    isCertified: false,
    business_types: values.businessTypes,
  };

  return (
    <div className="w-full">
      <Card className="border shadow-sm">
        <CardHeader className="pb-4 space-y-2">
          <CardTitle className="text-2xl sm:text-xl">Preview Your Listing</CardTitle>
          <CardDescription className="text-base sm:text-sm">
            This is how your business will appear to customers on Avante Maps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Review your business listing carefully. You can go back to edit any section before submitting.
            </AlertDescription>
          </Alert>

          <div className="max-w-md mx-auto">
            <PlaceCard 
              place={previewPlace}
              onPlaceClick={() => {}}
              showDetails={true}
              previewMode={true}
              className="shadow-lg"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious} 
            disabled={disabled}
          >
            Back
          </Button>
          <Button 
            type="submit" 
            className="bg-avante-blue hover:bg-avante-blue/90"
            disabled={disabled}
          >
            Submit Registration
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PreviewTab;
