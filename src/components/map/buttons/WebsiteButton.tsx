import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WebsiteButtonProps {
  url?: string;
}

const WebsiteButton: React.FC<WebsiteButtonProps> = ({ url = "#" }) => {
  const handleWebsiteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    if (url && url !== "#") {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
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
            disabled={!url || url === "#"}
          >
            Link
            <ExternalLink className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{url && url !== "#" ? url : "No URL available"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default WebsiteButton;
