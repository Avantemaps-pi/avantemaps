
import React, { useState } from 'react';
import { Bookmark, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from '@/lib/router-compat';
import { getOrigin } from '@/utils/browserEnv';
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
  const routerLocation = useLocation();
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareDialog(true);
  };

  // Build share URL (SSR-safe: router location + guarded origin)
  const isRecommendationsPage = routerLocation.pathname === '/recommendations';
  const shareUrl = isRecommendationsPage 
    ? `${getOrigin()}/recommendations/${placeId}`
    : `${getOrigin()}?place=${placeId}`;

  return (
    <>
      <div className="absolute top-2 right-2 flex gap-2">
        <Button 
          variant="secondary" 
          size="icon" 
          className={`rounded-full w-8 h-8 bg-surface-float backdrop-blur-xs text-foreground hover:bg-card ${
            isLoading ? 'opacity-70 cursor-wait' : ''
          }`}
          onClick={onBookmarkToggle}
          disabled={isLoading}
          aria-label={isBookmarked ? 'Remove from saved' : 'Save business'}
        >
          <Bookmark 
            className={`h-4 w-4 ${isBookmarked ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
          />
        </Button>
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full w-8 h-8 bg-surface-float backdrop-blur-xs text-foreground hover:bg-card"
          onClick={handleShareClick}
          title="Share this place"
          aria-label="Share this place"
        >
          <Share2 className="h-4 w-4 text-muted-foreground" />
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
