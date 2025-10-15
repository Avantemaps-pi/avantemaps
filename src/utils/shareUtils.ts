import { Place } from '@/types/business';

export const generateShareableUrl = (place: Place, currentPath?: string): string => {
  const baseUrl = window.location.origin;
  
  // If we're on the recommendations page, use recommendations URL format
  if (currentPath === '/recommendations') {
    return `${baseUrl}/recommendations/${place.id}`;
  }
  
  // Default to main map with place parameter
  return `${baseUrl}?place=${place.id}`;
};

export const generateShareText = (place: Place): string => {
  const category = place.category ? ` - ${place.category}` : '';
  return `Check out ${place.name}${category} on Avante Maps! 🗺️`;
};

export const generateShareTitle = (place: Place): string => {
  return `${place.name} - Avante Maps`;
};

export const generateShareDescription = (place: Place): string => {
  if (place.description) {
    return place.description;
  }
  
  const category = place.category ? ` ${place.category}` : '';
  return `Discover ${place.name}${category} at ${place.address}. Find amazing places on Avante Maps.`;
};

// Function to validate and convert image URLs to absolute URLs
export const getAbsoluteImageUrl = (imageUrl?: string): string => {
  const fallbackImage = `${window.location.origin}/og-image.png`;
  
  if (!imageUrl) return fallbackImage;
  
  // If already absolute URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If relative URL starting with /, make it absolute
  if (imageUrl.startsWith('/')) {
    return `${window.location.origin}${imageUrl}`;
  }
  
  // For any other format, return fallback
  return fallbackImage;
};

// Function to test social media preview URLs (for debugging)
export const getSocialPreviewUrls = (shareUrl: string) => {
  const encodedUrl = encodeURIComponent(shareUrl);
  
  return {
    facebook: `https://developers.facebook.com/tools/debug/?q=${encodedUrl}`,
    twitter: `https://cards-dev.twitter.com/validator?url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/post-inspector/inspect/${encodedUrl}`,
    whatsapp: `https://developers.facebook.com/tools/debug/?q=${encodedUrl}` // WhatsApp uses Facebook's scraper
  };
};
