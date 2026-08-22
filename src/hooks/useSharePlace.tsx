
import { useToast } from './use-toast';

export const useSharePlace = (placeName: string, placeId: string) => {
  const { toast } = useToast();

  const handleShare = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // Build share URL - use recommendations/:id for recommendations page
    const isRecommendationsPage = window.location.pathname === '/recommendations';
    const shareUrl = isRecommendationsPage 
      ? `${window.location.origin}/recommendations/${placeId}`
      : `${window.location.origin}?place=${placeId}`;
    
    // Web Share API - falls back to copy to clipboard
    if (navigator.share) {
      navigator.share({
        title: placeName,
        text: `Check out ${placeName} on Avante Maps`,
        url: shareUrl
      }).catch(err => {
        console.error('Error sharing', err);
      });
    } else {
      // Fallback - copy link to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Success',
        description: 'Link copied to clipboard!',
        duration: 2000
      });
    }
  };

  return { handleShare };
};
