import React from 'react';
import { MapPin } from 'lucide-react';
import HighlightText from './HighlightText';

interface PlaceCardAddressProps {
  address: string;
  onClick: () => void;
  highlightQuery?: string;
}

const PlaceCardAddress: React.FC<PlaceCardAddressProps> = ({ address, onClick, highlightQuery }) => {
  return (
    <div 
      className="flex items-center gap-1 text-sm text-muted-foreground mb-2 cursor-pointer hover:text-primary transition-colors"
      onClick={onClick}
    >
      <MapPin className="h-4 w-4 flex-shrink-0" />
      <span className="text-xs line-clamp-1">
        <HighlightText text={address} query={highlightQuery} />
      </span>
    </div>
  );
};

export default PlaceCardAddress;
