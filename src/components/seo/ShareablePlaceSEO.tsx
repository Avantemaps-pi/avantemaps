
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Place } from '@/data/mockPlaces';

interface ShareablePlaceSEOProps {
  place: Place;
  isActive: boolean;
  shareType?: 'default' | 'recommendations';
}

const ShareablePlaceSEO: React.FC<ShareablePlaceSEOProps> = ({ 
  place, 
  isActive, 
  shareType = 'default' 
}) => {
  if (!isActive) return null;

  // Create rich, descriptive content
  const title = `${place.name} - Discover on Avante Maps`;
  const description = place.description 
    ? `${place.description.substring(0, 155)}${place.description.length > 155 ? '...' : ''} | Located at ${place.address}. Rating: ${place.rating}/5 stars.`
    : `Visit ${place.name} at ${place.address}. Rated ${place.rating}/5 stars. Discover amazing places on Avante Maps.`;
  
  // Ensure absolute URL for images
  const imageUrl = place.image 
    ? (place.image.startsWith('http') ? place.image : `${window.location.origin}${place.image}`)
    : `${window.location.origin}/og-image.png`;
  
  // Create appropriate URL based on share type
  const url = shareType === 'recommendations'
    ? `${window.location.origin}/recommendations/${place.id}`
    : `${window.location.origin}?place=${place.id}`;

  // Enhanced site name and type
  const siteName = "Avante Maps";
  const appDescription = "Discover and explore amazing places with Avante Maps";

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={`${place.name}, ${place.category}, ${place.address}, local business, maps, discovery`} />
      <meta name="author" content="Avante Maps" />
      <link rel="canonical" href={url} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="business.business" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`Photo of ${place.name}`} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="en_US" />
      
      {/* Business specific Open Graph */}
      <meta property="business:contact_data:street_address" content={place.address} />
      <meta property="business:contact_data:website" content={place.website || url} />
      <meta property="place:location:latitude" content={place.coordinates?.split(',')[0] || ''} />
      <meta property="place:location:longitude" content={place.coordinates?.split(',')[1] || ''} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@AventeMaps" />
      <meta name="twitter:creator" content="@AventeMaps" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={`Photo of ${place.name}`} />
      
      {/* LinkedIn specific */}
      <meta property="og:image:type" content="image/jpeg" />
      
      {/* WhatsApp optimized */}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      
      {/* Additional structured data for better SEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": place.name,
          "description": place.description,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": place.address
          },
          "url": place.website || url,
          "image": imageUrl,
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": place.rating,
            "bestRating": "5"
          },
          "geo": place.coordinates ? {
            "@type": "GeoCoordinates",
            "latitude": place.coordinates.split(',')[0],
            "longitude": place.coordinates.split(',')[1]
          } : undefined
        })}
      </script>
    </Helmet>
  );
};

export default ShareablePlaceSEO;
