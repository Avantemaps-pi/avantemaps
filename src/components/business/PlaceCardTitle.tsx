
import React from 'react';
import { CircleCheck } from 'lucide-react';
import { CardTitle } from '@/components/ui/card';

interface PlaceCardTitleProps {
  name: string;
  onClick: () => void;
  isVerified?: boolean;
}

const PlaceCardTitle: React.FC<PlaceCardTitleProps> = ({ name, onClick, isVerified = false }) => {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        {isVerified && (
          <div className="flex-shrink-0">
            <CircleCheck className="h-5 w-5 text-green-500" />
          </div>
        )}
        <CardTitle 
          className="text-base font-bold cursor-pointer hover:text-primary transition-colors line-clamp-1"
          onClick={onClick}
        >
          {name}
        </CardTitle>
      </div>
    </div>
  );
};

export default PlaceCardTitle;
