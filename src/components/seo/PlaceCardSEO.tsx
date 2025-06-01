
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
  const description = place.description || `Visit ${place.name} at ${place.address}`;
  const imageUrl = place.image || '/og-image.png';
  const url = `${window.location.origin}?place=${place.id}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="business.business" />
      <meta property="og:site_name" content="Avante Maps" />
      
      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      
      {/* Business specific meta tags */}
      <meta property="business:contact_data:street_address" content={place.address} />
      <meta property="business:contact_data:locality" content={place.address} />
      <meta property="business:contact_data:website" content={place.website} />
    </Helmet>
  );
};

export default PlaceCardSEO;
