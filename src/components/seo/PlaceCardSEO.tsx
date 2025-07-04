
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Place } from '@/data/mockPlaces';

interface PlaceCardSEOProps {
  place: Place;
  isActive: boolean;
}

const PlaceCardSEO: React.FC<PlaceCardSEOProps> = ({ place, isActive }) => {
  if (!isActive) return null;

  const title = `${place.name} - Avante Maps`;
  const description = place.description || `Visit ${place.name} at ${place.address}. ${place.category}`;
  
  // Ensure image URL is absolute
  const getAbsoluteImageUrl = (imageUrl: string | undefined) => {
    if (!imageUrl) return `${window.location.origin}/og-image.png`;
    
    // If already absolute URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If relative URL, make it absolute
    if (imageUrl.startsWith('/')) {
      return `${window.location.origin}${imageUrl}`;
    }
    
    // Default fallback
    return `${window.location.origin}/og-image.png`;
  };

  const imageUrl = getAbsoluteImageUrl(place.image);
  const url = `${window.location.origin}?place=${place.id}`;
  const siteName = 'Avante Maps';

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      
      {/* Open Graph Meta Tags for Facebook, WhatsApp, LinkedIn */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={`Image of ${place.name}`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="business.business" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@AventeMaps" />
      <meta name="twitter:creator" content="@AventeMaps" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={`Image of ${place.name}`} />
      <meta name="twitter:url" content={url} />
      
      {/* Additional Business-specific Meta Tags */}
      <meta property="business:contact_data:street_address" content={place.address} />
      <meta property="business:contact_data:locality" content={place.address} />
      <meta property="business:contact_data:website" content={place.website} />
      <meta property="place:location:latitude" content={place.position?.lat?.toString()} />
      <meta property="place:location:longitude" content={place.position?.lng?.toString()} />
      
      {/* Schema.org structured data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": place.name,
          "description": description,
          "image": imageUrl,
          "url": url,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": place.address
          },
          "aggregateRating": place.rating ? {
            "@type": "AggregateRating",
            "ratingValue": place.rating,
            "ratingCount": "1"
          } : undefined,
          "geo": place.position ? {
            "@type": "GeoCoordinates",
            "latitude": place.position.lat,
            "longitude": place.position.lng
          } : undefined
        })}
      </script>
    </Helmet>
  );
};

export default PlaceCardSEO;
