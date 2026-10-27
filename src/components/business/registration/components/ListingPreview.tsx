import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormValues } from '../formSchema';
import { Place } from '@/types/business';
import PlaceCard from '../../PlaceCard';
import { ImageUploadStatus } from '@/hooks/useImageUpload';

interface ListingPreviewProps {
  images: ImageUploadStatus[];
  existingImages?: string[];
}

const ListingPreview: React.FC<ListingPreviewProps> = ({ images, existingImages = [] }) => {
  const { getValues } = useFormContext<FormValues>();
  const values = getValues();

  // Collect all preview images for slideshow
  const getAllPreviewImages = (): string[] => {
    const allImages: string[] = [];
    if (existingImages.length > 0) {
      allImages.push(...existingImages);
    }
    images.forEach(img => {
      if (img.previewUrl && !allImages.includes(img.previewUrl)) {
        allImages.push(img.previewUrl);
      }
    });
    return allImages;
  };

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
    image: getAllPreviewImages()[0],
    images: getAllPreviewImages(),
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
    <div className="max-w-md mx-auto">
      <PlaceCard 
        place={previewPlace}
        onPlaceClick={() => {}}
        showDetails={true}
        previewMode
        disableRating={true}
        disableBookmark={true}
        className="shadow-lg"
      />
    </div>
  );
};

export default ListingPreview;
