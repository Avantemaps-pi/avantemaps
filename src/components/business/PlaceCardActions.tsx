
import React, { useState } from 'react';
import { Bookmark, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShareDialog from './ShareDialog';

interface PlaceCardActionsProps {
  isBookmarked: boolean;
  onBookmarkToggle: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
  isLoading?: boolean;
  placeName: string;
  placeId: string;
}

const PlaceCardActions: React.FC<PlaceCardActionsProps> = ({ 
  isBookmarked, 
  onBookmarkToggle, 
  onShare,
  isLoading,
  placeName,
  placeId
}) => {
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareDialog(true);
  };

  // Build share URL
  const isRecommendationsPage = window.location.pathname === '/recommendations';
  const shareUrl = isRecommendationsPage 
    ? `${window.location.origin}/recommendations/${placeId}`
    : `${window.location.origin}?place=${placeId}`;

  return (
    <>
      <div className="absolute top-2 right-2 flex gap-2">
        <Button 
          variant="secondary" 
          size="icon" 
          className={`rounded-full w-8 h-8 bg-white/80 backdrop-blur-xs text-gray-800 hover:bg-white ${
            isLoading ? 'opacity-70 cursor-wait' : ''
          }`}
          onClick={onBookmarkToggle}
          disabled={isLoading}
        >
          <Bookmark 
            className={`h-4 w-4 ${isBookmarked ? 'text-primary fill-primary' : 'text-gray-600'}`}
          />
        </Button>
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full w-8 h-8 bg-white/80 backdrop-blur-xs text-gray-800 hover:bg-white"
          onClick={handleShareClick}
          title="Share this place"
          aria-label="Share this place"
        >
          <Share2 className="h-4 w-4 text-gray-600" />
        </Button>
      </div>

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        placeName={placeName}
        shareUrl={shareUrl}
      />
    </>
  );
};

export default PlaceCardActions;
