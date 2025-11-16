import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlaceCardWebsiteButtonProps {
  url: string;
}

const PlaceCardWebsiteButton: React.FC<PlaceCardWebsiteButtonProps> = ({ url }) => {
  const handleWebsiteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent's onClick
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="default" 
            size="sm" 
            className="bg-green-500 hover:bg-green-600 text-xs font-medium flex items-center gap-1 whitespace-nowrap h-9 px-3"
            onClick={handleWebsiteClick}
          >
            Link
            <ExternalLink className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{url}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PlaceCardWebsiteButton;
