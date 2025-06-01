
import { useEffect } from 'react';
import { Place } from '@/data/mockPlaces';

interface PlaceCardSEOProps {
  place: Place;
}

const PlaceCardSEO = ({ place }: PlaceCardSEOProps) => {
  useEffect(() => {
    // Update meta tags for Open Graph
    const updateMetaTag = (property: string, content: string) => {
      let element = document.querySelector(`meta[property="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('property', property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const updateNameMetaTag = (name: string, content: string) => {
      let element = document.querySelector(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('name', name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Set Open Graph tags
    updateMetaTag('og:title', place.name);
    updateMetaTag('og:description', place.description);
    updateMetaTag('og:image', place.image);
    updateMetaTag('og:url', window.location.href);
    updateMetaTag('og:type', 'business.business');
    
    // Set Twitter Card tags
    updateNameMetaTag('twitter:card', 'summary_large_image');
    updateNameMetaTag('twitter:title', place.name);
    updateNameMetaTag('twitter:description', place.description);
    updateNameMetaTag('twitter:image', place.image);

    // Set page title
    document.title = `${place.name} - Avante Maps`;

    return () => {
      // Reset to default title when component unmounts
      document.title = 'Avante Maps';
    };
  }, [place]);

  return null; // This component doesn't render anything
};

export default PlaceCardSEO;
