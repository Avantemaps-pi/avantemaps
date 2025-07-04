
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Place } from '@/data/mockPlaces';

interface RecommendationsSEOProps {
  selectedPlace?: Place;
  placeId?: string;
}

const RecommendationsSEO: React.FC<RecommendationsSEOProps> = ({ selectedPlace, placeId }) => {
  // Default SEO for recommendations page
  const defaultTitle = 'Discover Amazing Places - Avante Maps Recommendations';
  const defaultDescription = 'Explore curated recommendations of top places, restaurants, and businesses on Avante Maps. Find your next favorite spot!';
  const defaultImage = `${window.location.origin}/og-image.png`;
  const defaultUrl = `${window.location.origin}/recommendations`;

  // If a specific place is selected, use its details
  if (selectedPlace) {
    const title = `${selectedPlace.name} - Recommended on Avante Maps`;
    const description = selectedPlace.description || `Discover ${selectedPlace.name} at ${selectedPlace.address}. ${selectedPlace.category}`;
    
    const getAbsoluteImageUrl = (imageUrl: string | undefined) => {
      if (!imageUrl) return defaultImage;
      
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }
      
      if (imageUrl.startsWith('/')) {
        return `${window.location.origin}${imageUrl}`;
      }
      
      return defaultImage;
    };

    const imageUrl = getAbsoluteImageUrl(selectedPlace.image);
    const url = `${window.location.origin}/recommendations/${selectedPlace.id}`;

    return (
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        
        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:image:alt" content={`Image of ${selectedPlace.name}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="business.business" />
        <meta property="og:site_name" content="Avante Maps" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={imageUrl} />
        <meta name="twitter:image:alt" content={`Image of ${selectedPlace.name}`} />
        <meta name="twitter:url" content={url} />
      </Helmet>
    );
  }

  // Default recommendations page SEO
  return (
    <Helmet>
      <title>{defaultTitle}</title>
      <meta name="description" content={defaultDescription} />
      <link rel="canonical" href={defaultUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={defaultTitle} />
      <meta property="og:description" content={defaultDescription} />
      <meta property="og:image" content={defaultImage} />
      <meta property="og:image:alt" content="Avante Maps Recommendations" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={defaultUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Avante Maps" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={defaultTitle} />
      <meta name="twitter:description" content={defaultDescription} />
      <meta name="twitter:image" content={defaultImage} />
      <meta name="twitter:image:alt" content="Avante Maps Recommendations" />
      <meta name="twitter:url" content={defaultUrl} />
    </Helmet>
  );
};

export default RecommendationsSEO;
