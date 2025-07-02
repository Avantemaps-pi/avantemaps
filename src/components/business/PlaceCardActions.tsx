
import React from 'react';
import { Bookmark, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlaceCardActionsProps {
  isBookmarked: boolean;
  onBookmarkToggle: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
  isLoading?: boolean;
}

const PlaceCardActions: React.FC<PlaceCardActionsProps> = ({ 
  isBookmarked, 
  onBookmarkToggle, 
  onShare,
  isLoading
}) => {
  return (
    <div className="absolute top-3 right-3 flex gap-2">
      <Button 
        variant="secondary" 
        size="icon" 
        className={`rounded-md w-8 h-8 bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white border border-gray-200 ${
          isLoading ? 'opacity-70 cursor-wait' : ''
        }`}
        onClick={onBookmarkToggle}
        disabled={isLoading}
      >
        <Bookmark 
          className={`h-4 w-4 ${isBookmarked ? 'text-gray-600 fill-gray-600' : 'text-gray-600'}`}
        />
      </Button>
    </div>
  );
};

export default PlaceCardActions;
